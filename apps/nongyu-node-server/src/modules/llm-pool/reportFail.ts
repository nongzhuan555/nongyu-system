import { randomUUID } from "node:crypto";
import type { Request } from "express";
import { getEnv } from "../../config/env.js";
import { AppError, ErrorCodes, isAppError } from "../../lib/errors.js";
import { createLogger } from "../../lib/logger.js";
import { getLlmPoolConfig } from "./config.js";

const TRACK_REPORT_TIMEOUT_MS = 2000;

const LLM_PROXY_FAIL_CODES = new Set<number>([
  ErrorCodes.LLM_UPSTREAM_FAILED,
  ErrorCodes.LLM_POOL_BUSY,
  ErrorCodes.LLM_POOL_UNAVAILABLE,
  ErrorCodes.LLM_USER_DAILY_LIMIT,
  ErrorCodes.LLM_USER_BUSY,
]);

export type LlmProxyFailContext = {
  userId: number;
  studentNo?: string;
  stream?: boolean;
};

function clipMessage(message: string, max = 512): string {
  if (message.length <= max) return message;
  return message.slice(0, max);
}

/**
 * 异步上报平台 LLM 代理业务失败到 Track；永不抛错、不阻塞响应。
 */
export function reportLlmProxyFailAsync(ctx: LlmProxyFailContext, err: unknown): void {
  if (!isAppError(err) || !LLM_PROXY_FAIL_CODES.has(err.code)) return;
  if (!ctx.userId || ctx.userId <= 0) return;

  void postLlmProxyFail(ctx, err).catch((reportErr) => {
    try {
      createLogger().warn({ err: reportErr, code: err.code }, "llm proxy fail track report failed");
    } catch {
      console.warn("[llm-pool] track report failed", reportErr);
    }
  });
}

export function reportLlmProxyFailFromRequest(req: Request, err: unknown): void {
  const userId = req.appAuth?.uid;
  if (!userId) return;
  const stream = (req.body as { stream?: unknown } | undefined)?.stream === true;
  reportLlmProxyFailAsync(
    {
      userId,
      studentNo: req.appAuth?.studentNo,
      stream,
    },
    err,
  );
}

async function postLlmProxyFail(ctx: LlmProxyFailContext, err: AppError): Promise<void> {
  const env = getEnv();
  const cfg = getLlmPoolConfig();
  let reportedModel = cfg.defaultModel;
  let attempts: unknown;
  if (err.data && typeof err.data === "object") {
    const data = err.data as { attempts?: unknown };
    if (Array.isArray(data.attempts)) {
      attempts = data.attempts;
      const last = data.attempts[data.attempts.length - 1] as { model?: unknown } | undefined;
      if (typeof last?.model === "string" && last.model.trim()) {
        reportedModel = last.model.trim();
      }
    }
  }
  const props: Record<string, unknown> = {
    error_code: err.code,
    error_message: clipMessage(err.message),
    model: reportedModel,
  };
  if (ctx.stream !== undefined) props.stream = ctx.stream;
  if (attempts !== undefined) props.attempts = attempts;

  const body = {
    user_id: ctx.userId,
    student_no: ctx.studentNo ?? "",
    events: [
      {
        event_id: randomUUID(),
        event_type: "llm_proxy_fail",
        event_name: String(err.code),
        client_ts_ms: Date.now(),
        props,
      },
    ],
  };

  const response = await fetch(`${env.TRACK_BASE_URL}/v1/internal/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Internal-Token": env.INTERNAL_TOKEN,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TRACK_REPORT_TIMEOUT_MS),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`track status ${response.status}: ${text.slice(0, 200)}`);
  }
}
