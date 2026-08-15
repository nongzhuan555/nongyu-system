import { AppError, ErrorCodes } from "../../lib/errors.js";
import { getEnv } from "../../config/env.js";

const TRACK_TIMEOUT_MS = 5000;

type TrackSuccess = { ok: true; data: unknown };
type TrackFailure = { ok: false; error?: { code?: string; message?: string } };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isTrackSuccess(value: unknown): value is TrackSuccess {
  return isRecord(value) && value.ok === true;
}

function isTrackFailure(value: unknown): value is TrackFailure {
  return isRecord(value) && value.ok === false;
}

function unavailable(): AppError {
  return new AppError(ErrorCodes.TRACK_UNAVAILABLE, "埋点服务暂不可用", 503);
}

function badGateway(): AppError {
  return new AppError(ErrorCodes.TRACK_BAD_GATEWAY, "埋点指标查询失败", 502);
}

/** 带超时调用 Track Admin；不把上游 URL/Token 写入对用户文案。 */
export async function trackAdminGet(pathWithQuery: string): Promise<unknown> {
  const env = getEnv();
  const url = `${env.TRACK_BASE_URL}${pathWithQuery}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Internal-Token": env.INTERNAL_TOKEN,
      },
      signal: AbortSignal.timeout(TRACK_TIMEOUT_MS),
    });
  } catch {
    throw unavailable();
  }

  if (response.status === 403 || response.status >= 500) {
    throw unavailable();
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw badGateway();
  }

  if (response.ok && isTrackSuccess(body)) {
    return body.data;
  }

  if (isTrackFailure(body) && body.error?.code === "FORBIDDEN") {
    throw unavailable();
  }

  throw badGateway();
}
