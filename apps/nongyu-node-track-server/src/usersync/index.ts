import type { Logger } from "pino";

type Task = { userId: number; online: boolean; lastActiveMs: number };
type Sent = { at: number; online: boolean };

/** 合并/重试回写业务 Node presence；离线优先 flush。 */
export class Syncer {
  private pending: Task[] = [];
  private lastSent = new Map<number, Sent>();
  private wake: (() => void) | null = null;
  private stopped = false;
  private loopPromise: Promise<void>;
  private coalesceMs = 30_000;

  constructor(
    private baseURL: string,
    private token: string,
    private log: Logger,
  ) {
    this.loopPromise = this.loop();
  }

  stop(): Promise<void> {
    this.stopped = true;
    this.wake?.();
    return this.loopPromise;
  }

  /** 入队回写；离线通知立即 flush。 */
  notify(userId: number, online: boolean, lastActiveMs: number): void {
    this.pending.push({ userId, online, lastActiveMs });
    if (!online) {
      void this.flushOnce();
      return;
    }
    this.wake?.();
  }

  private async loop(): Promise<void> {
    while (!this.stopped) {
      await Promise.race([
        new Promise<void>((r) => {
          this.wake = r;
        }),
        sleep(2000),
      ]);
      this.wake = null;
      await this.flushOnce();
    }
    await this.flushOnce();
  }

  private async flushOnce(): Promise<void> {
    const batch = this.pending;
    this.pending = [];
    if (batch.length === 0) return;

    const latest = new Map<number, Task>();
    for (const t of batch) latest.set(t.userId, t);

    const retry: Task[] = [];
    const now = Date.now();
    for (const t of latest.values()) {
      if (t.online && this.skipCoalesce(t.userId, true, now)) continue;
      try {
        await this.post(t);
        this.lastSent.set(t.userId, { at: now, online: t.online });
      } catch (err) {
        this.log.warn({ err, user_id: t.userId }, "usersync failed");
        retry.push(t);
      }
    }
    if (retry.length > 0) {
      this.pending = [...retry, ...this.pending];
    }
  }

  private skipCoalesce(userId: number, online: boolean, now: number): boolean {
    const prev = this.lastSent.get(userId);
    if (!prev) return false;
    return prev.online === online && now - prev.at < this.coalesceMs;
  }

  private async post(t: Task): Promise<void> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    try {
      const res = await fetch(`${this.baseURL}/api/internal/users/presence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Token": this.token,
        },
        body: JSON.stringify({
          user_id: t.userId,
          is_online: t.online ? 1 : 0,
          last_active_at_ms: t.lastActiveMs,
        }),
        signal: ctrl.signal,
      });
      if (res.status === 404) return; // 用户不存在不重试
      if (res.status >= 300) throw new Error(`node status ${res.status}`);
    } finally {
      clearTimeout(timer);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
