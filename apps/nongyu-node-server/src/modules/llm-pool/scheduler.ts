import { randomUUID } from "node:crypto";
import { AppError, ErrorCodes } from "../../lib/errors.js";
import { getLlmPoolConfig } from "./config.js";
import { decryptApiKey } from "./crypto.js";
import { listEnabledPoolKeys, type LlmApiKeyRow } from "./repo.js";

type RuntimeState = {
  inFlight: number;
  cooldownUntil: number;
  failStreak: number;
};

type CachedKey = {
  row: LlmApiKeyRow;
  plainKey?: string;
};

export type PoolLease = {
  leaseId: string;
  keyId: number;
  /** 运营侧名称，仅日志/错误明细用，不含明文 Key */
  keyName: string;
  accountGroup: string;
  userId: number;
  apiKeyPlain: string;
  baseUrl: string;
  model: string;
  acquiredAt: number;
};

type Waiter = {
  userId: number;
  resolve: (lease: PoolLease) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
};

const CANDIDATE_TTL_MS = 30_000;
const COOLDOWN_BASE_MS = 10_000;
const COOLDOWN_CAP_MS = 5 * 60_000;

class KeyPoolScheduler {
  private candidates: CachedKey[] = [];
  private candidatesLoadedAt = 0;
  private runtime = new Map<number, RuntimeState>();
  private leases = new Map<string, PoolLease & { timer: NodeJS.Timeout }>();
  private userLease = new Map<number, string>();
  private waiters: Waiter[] = [];
  private rr = 0;
  private droppedKeys = new Set<number>();

  invalidateCache() {
    this.candidates = [];
    this.candidatesLoadedAt = 0;
  }

  dropKey(keyId: number) {
    this.droppedKeys.add(keyId);
    this.invalidateCache();
  }

  getRuntimeSnapshot(keyId: number): {
    inFlight: number;
    cooling: boolean;
    cooldownUntil: string | null;
  } {
    const rt = this.runtime.get(keyId);
    const now = Date.now();
    const cooldownUntil = rt?.cooldownUntil && rt.cooldownUntil > now ? rt.cooldownUntil : 0;
    return {
      inFlight: rt?.inFlight ?? 0,
      cooling: cooldownUntil > 0,
      cooldownUntil: cooldownUntil > 0 ? new Date(cooldownUntil).toISOString() : null,
    };
  }

  private ensureRuntime(keyId: number): RuntimeState {
    let rt = this.runtime.get(keyId);
    if (!rt) {
      rt = { inFlight: 0, cooldownUntil: 0, failStreak: 0 };
      this.runtime.set(keyId, rt);
    }
    return rt;
  }

  private async loadCandidates(force = false): Promise<CachedKey[]> {
    const now = Date.now();
    if (!force && this.candidates.length > 0 && now - this.candidatesLoadedAt < CANDIDATE_TTL_MS) {
      return this.candidates.filter((c) => !this.droppedKeys.has(Number(c.row.id)));
    }
    const rows = await listEnabledPoolKeys();
    this.candidates = rows
      .filter((r) => !this.droppedKeys.has(Number(r.id)))
      .map((row) => ({ row }));
    this.candidatesLoadedAt = now;
    return this.candidates;
  }

  private resolveLeaseEndpoint(
    row: LlmApiKeyRow,
    cfg: ReturnType<typeof getLlmPoolConfig>,
  ): { baseUrl: string; model: string } {
    const rawBase = typeof row.base_url === "string" ? row.base_url.trim() : "";
    const rawModel = typeof row.model === "string" ? row.model.trim() : "";
    return {
      baseUrl: (rawBase || cfg.defaultBaseUrl).replace(/\/+$/, ""),
      model: rawModel || cfg.defaultModel,
    };
  }

  private groupCapacity(keys: CachedKey[], accountGroup: string): number {
    const group = keys.filter((k) => k.row.account_group === accountGroup);
    if (group.length === 0) return 0;
    return Math.max(1, Math.min(...group.map((k) => Math.max(1, k.row.max_concurrent))));
  }

  private groupInFlight(accountGroup: string): number {
    let sum = 0;
    for (const lease of this.leases.values()) {
      if (lease.accountGroup === accountGroup) sum += 1;
    }
    return sum;
  }

  private score(key: CachedKey): number {
    const rt = this.ensureRuntime(Number(key.row.id));
    return key.row.weight * 10 - rt.failStreak * 5 - rt.inFlight * 3;
  }

  private pickKey(keys: CachedKey[], now: number): CachedKey | null {
    const eligible = keys.filter((k) => {
      const id = Number(k.row.id);
      const rt = this.ensureRuntime(id);
      if (rt.cooldownUntil > now) return false;
      const cap = this.groupCapacity(keys, k.row.account_group);
      if (this.groupInFlight(k.row.account_group) >= cap) return false;
      return true;
    });
    if (eligible.length === 0) return null;
    eligible.sort((a, b) => this.score(b) - this.score(a));
    const bestScore = this.score(eligible[0]!);
    const top = eligible.filter((k) => this.score(k) === bestScore);
    const picked = top[this.rr % top.length]!;
    this.rr += 1;
    return picked;
  }

  private async materializeLease(
    userId: number,
    picked: CachedKey,
    cfg: ReturnType<typeof getLlmPoolConfig>,
  ): Promise<PoolLease> {
    const keyId = Number(picked.row.id);
    let plain = picked.plainKey;
    if (!plain) {
      plain = decryptApiKey(picked.row.api_key_cipher);
      picked.plainKey = plain;
    }
    const leaseId = randomUUID();
    const endpoint = this.resolveLeaseEndpoint(picked.row, cfg);
    const lease: PoolLease = {
      leaseId,
      keyId,
      keyName: picked.row.name,
      accountGroup: picked.row.account_group,
      userId,
      apiKeyPlain: plain,
      baseUrl: endpoint.baseUrl,
      model: endpoint.model,
      acquiredAt: Date.now(),
    };
    const rt = this.ensureRuntime(keyId);
    rt.inFlight += 1;
    const timer = setTimeout(() => {
      void this.release(leaseId, { reason: "lease-timeout" });
    }, cfg.leaseMaxMs);
    this.leases.set(leaseId, { ...lease, timer });
    this.userLease.set(userId, leaseId);
    return lease;
  }

  private wakeWaiters() {
    if (this.waiters.length === 0) return;
    const pending = [...this.waiters];
    this.waiters = [];
    for (const w of pending) {
      clearTimeout(w.timer);
      void this.acquire(w.userId)
        .then((lease) => w.resolve(lease))
        .catch((err) => w.reject(err instanceof Error ? err : new Error(String(err))));
    }
  }

  async acquire(userId: number): Promise<PoolLease> {
    const cfg = getLlmPoolConfig();
    if (!cfg.enabled) {
      throw new AppError(ErrorCodes.LLM_POOL_UNAVAILABLE, "平台模型暂不可用", 503);
    }
    if (this.userLease.has(userId)) {
      throw new AppError(ErrorCodes.LLM_USER_BUSY, "请等待当前回复完成后再试", 429);
    }

    const keys = await this.loadCandidates();
    if (keys.length === 0) {
      throw new AppError(ErrorCodes.LLM_POOL_UNAVAILABLE, "平台模型暂不可用", 503);
    }

    const now = Date.now();
    const picked = this.pickKey(keys, now);
    if (picked) {
      return this.materializeLease(userId, picked, cfg);
    }

    return new Promise<PoolLease>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w.timer !== timer);
        reject(
          new AppError(ErrorCodes.LLM_POOL_BUSY, "平台模型繁忙，请稍后重试或配置自有 Key", 503),
        );
      }, cfg.queueWaitMs);
      this.waiters.push({ userId, resolve, reject, timer });
    });
  }

  async release(
    leaseId: string,
    opts?: { success?: boolean; errorSummary?: string; reason?: string },
  ): Promise<void> {
    const lease = this.leases.get(leaseId);
    if (!lease) return;
    clearTimeout(lease.timer);
    this.leases.delete(leaseId);
    if (this.userLease.get(lease.userId) === leaseId) {
      this.userLease.delete(lease.userId);
    }
    const rt = this.ensureRuntime(lease.keyId);
    rt.inFlight = Math.max(0, rt.inFlight - 1);

    if (opts?.success) {
      rt.failStreak = 0;
    } else if (opts?.errorSummary || opts?.reason === "upstream-fail") {
      rt.failStreak += 1;
      const delay = Math.min(
        COOLDOWN_CAP_MS,
        COOLDOWN_BASE_MS * 2 ** Math.min(rt.failStreak - 1, 5),
      );
      rt.cooldownUntil = Date.now() + delay;
    }

    this.wakeWaiters();
  }

  markCooldown(keyId: number, errorSummary?: string) {
    const rt = this.ensureRuntime(keyId);
    rt.failStreak += 1;
    const delay = Math.min(COOLDOWN_CAP_MS, COOLDOWN_BASE_MS * 2 ** Math.min(rt.failStreak - 1, 5));
    rt.cooldownUntil = Date.now() + delay;
    void errorSummary;
  }

  /** 测试用：清空内存态 */
  resetForTests() {
    for (const lease of this.leases.values()) clearTimeout(lease.timer);
    for (const w of this.waiters) clearTimeout(w.timer);
    this.candidates = [];
    this.candidatesLoadedAt = 0;
    this.runtime.clear();
    this.leases.clear();
    this.userLease.clear();
    this.waiters = [];
    this.rr = 0;
    this.droppedKeys.clear();
  }
}

export const keyPoolScheduler = new KeyPoolScheduler();
