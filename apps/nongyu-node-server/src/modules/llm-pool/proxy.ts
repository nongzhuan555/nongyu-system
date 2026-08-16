import type { Request, Response } from "express";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { AppError, ErrorCodes } from "../../lib/errors.js";
import { createLogger } from "../../lib/logger.js";
import { assertPoolEnabled, getLlmPoolConfig } from "./config.js";
import { bumpKeyStats } from "./repo.js";
import { keyPoolScheduler, type PoolLease } from "./scheduler.js";
import { assertUnderDailyLimit, recordDailyUsage } from "./usage.js";

type AttemptFail = {
  attempt: number;
  keyId: number;
  keyName: string;
  accountGroup: string;
  model: string;
  baseUrl: string;
  reason: string;
};

function summarizeUpstreamError(status: number, bodyText: string): string {
  const snip = bodyText.replace(/\s+/g, " ").slice(0, 400);
  return `upstream ${status}: ${snip || "empty"}`;
}

function formatUpstreamFailedMessage(attempts: AttemptFail[]): string {
  if (attempts.length === 0) {
    return "平台模型调用失败，请稍后重试（无尝试明细）";
  }
  const lines = attempts.map(
    (a) =>
      `#${a.attempt} keyId=${a.keyId} name=${a.keyName} group=${a.accountGroup} model=${a.model}: ${a.reason}`,
  );
  return `平台模型调用失败。尝试明细：\n${lines.join("\n")}`;
}

function throwUpstreamFailed(attempts: AttemptFail[]): never {
  try {
    createLogger().warn({ attempts }, "llm pool upstream failed");
  } catch {
    console.warn("[llm-pool] upstream failed", attempts);
  }
  throw new AppError(ErrorCodes.LLM_UPSTREAM_FAILED, formatUpstreamFailedMessage(attempts), 502, {
    attempts,
  });
}

async function fetchUpstream(
  lease: PoolLease,
  body: Record<string, unknown>,
  signal: AbortSignal,
): Promise<globalThis.Response> {
  const url = `${lease.baseUrl}/chat/completions`;
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lease.apiKeyPlain}`,
    },
    body: JSON.stringify({ ...body, model: lease.model }),
    signal,
  });
}

function attemptMeta(lease: PoolLease, attempt: number, reason: string): AttemptFail {
  return {
    attempt: attempt + 1,
    keyId: lease.keyId,
    keyName: lease.keyName,
    accountGroup: lease.accountGroup,
    model: lease.model,
    baseUrl: lease.baseUrl,
    reason,
  };
}

export async function handleChatCompletions(req: Request, res: Response): Promise<void> {
  assertPoolEnabled();
  const userId = req.appAuth?.uid;
  if (!userId) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, "未认证", 401);
  }

  await assertUnderDailyLimit(userId);

  const body = (req.body ?? {}) as Record<string, unknown>;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError(ErrorCodes.VALIDATION, "请求体无效", 400);
  }
  if (!Array.isArray(body.messages)) {
    throw new AppError(ErrorCodes.VALIDATION, "messages 必填", 400);
  }

  const stream = body.stream === true;
  const cfg = getLlmPoolConfig();
  // 上游 model 由租约 Key 解析（空则全局默认）；忽略客户端传入的 model
  delete body.model;

  const clientAbort = new AbortController();
  req.on("close", () => {
    if (!res.writableEnded) clientAbort.abort();
  });

  const maxAttempts = 1 + cfg.maxKeyRetries;
  const attemptFails: AttemptFail[] = [];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (clientAbort.signal.aborted) {
      throw new AppError(ErrorCodes.VALIDATION, "请求已取消", 400);
    }

    const lease = await keyPoolScheduler.acquire(userId);
    if (attempt === 0) {
      await recordDailyUsage(userId);
    }

    const upstreamAbort = new AbortController();
    const onClientAbort = () => upstreamAbort.abort();
    clientAbort.signal.addEventListener("abort", onClientAbort, { once: true });

    let firstTokenTimer: NodeJS.Timeout | null = null;
    if (stream) {
      firstTokenTimer = setTimeout(() => upstreamAbort.abort(), cfg.firstTokenTimeoutMs);
    }

    try {
      const upstream = await fetchUpstream(lease, body, upstreamAbort.signal);

      if (!upstream.ok) {
        if (firstTokenTimer) clearTimeout(firstTokenTimer);
        const text = await upstream.text().catch(() => "");
        const reason = summarizeUpstreamError(upstream.status, text);
        attemptFails.push(attemptMeta(lease, attempt, reason));
        await bumpKeyStats(lease.keyId, "fail", reason);
        await keyPoolScheduler.release(lease.leaseId, {
          success: false,
          errorSummary: reason,
          reason: "upstream-fail",
        });
        continue;
      }

      if (!stream) {
        if (firstTokenTimer) clearTimeout(firstTokenTimer);
        const json = await upstream.json();
        await bumpKeyStats(lease.keyId, "success", null);
        await keyPoolScheduler.release(lease.leaseId, { success: true });
        res.status(200).json(json);
        return;
      }

      if (firstTokenTimer) {
        clearTimeout(firstTokenTimer);
        firstTokenTimer = null;
      }

      const contentType = upstream.headers.get("content-type") ?? "text/event-stream";
      res.status(200);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      if (typeof res.flushHeaders === "function") {
        res.flushHeaders();
      }

      if (!upstream.body) {
        const reason = "empty-body";
        attemptFails.push(attemptMeta(lease, attempt, reason));
        await bumpKeyStats(lease.keyId, "fail", reason);
        await keyPoolScheduler.release(lease.leaseId, {
          success: false,
          reason: "upstream-fail",
        });
        throwUpstreamFailed(attemptFails);
      }

      const nodeStream = Readable.fromWeb(
        upstream.body as import("node:stream/web").ReadableStream,
      );
      try {
        await pipeline(nodeStream, res);
        await bumpKeyStats(lease.keyId, "success", null);
        await keyPoolScheduler.release(lease.leaseId, { success: true });
      } catch (pipeErr) {
        const summary =
          pipeErr instanceof Error ? pipeErr.message.slice(0, 160) : "stream-pipe-error";
        attemptFails.push(attemptMeta(lease, attempt, summary));
        await bumpKeyStats(lease.keyId, "fail", summary);
        await keyPoolScheduler.release(lease.leaseId, {
          success: false,
          errorSummary: summary,
          reason: "upstream-fail",
        });
        if (!res.headersSent) {
          throwUpstreamFailed(attemptFails);
        }
      }
      return;
    } catch (err) {
      if (firstTokenTimer) clearTimeout(firstTokenTimer);
      if (res.headersSent) {
        await keyPoolScheduler.release(lease.leaseId, {
          success: false,
          reason: "upstream-fail",
        });
        return;
      }
      if (err instanceof AppError) throw err;
      const reason =
        err instanceof Error && err.name === "AbortError"
          ? "first-token-timeout-or-abort"
          : err instanceof Error
            ? err.message.slice(0, 400)
            : "upstream-error";
      attemptFails.push(attemptMeta(lease, attempt, reason));
      await bumpKeyStats(lease.keyId, "fail", reason);
      await keyPoolScheduler.release(lease.leaseId, {
        success: false,
        errorSummary: reason,
        reason: "upstream-fail",
      });
    } finally {
      clientAbort.signal.removeEventListener("abort", onClientAbort);
    }
  }

  throwUpstreamFailed(attemptFails);
}
