/**
 * 二课请求错误辅助
 */

export const SECOND_NETWORK_HINT = "二课服务暂时不可达，请稍后重试或检查网络";

/**
 * 是否超时类错误
 */
export function isSecondTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return /timeout/i.test(String(error ?? ""));
  }
  const err = error as { code?: string; message?: string; cause?: unknown };
  if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT" || err.code === "ESOCKETTIMEDOUT") {
    return true;
  }
  if (typeof err.message === "string" && /timeout/i.test(err.message)) {
    return true;
  }
  if (err.cause) return isSecondTimeoutError(err.cause);
  return false;
}

/**
 * 面向调用方的错误文案
 */
export function resolveSecondErrorMessage(error: unknown, fallback = "请求失败"): string {
  if (isSecondTimeoutError(error)) return SECOND_NETWORK_HINT;
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return fallback;
}

/**
 * 统一失败结果
 */
export function secondFailResult<T>(
  result: T,
  error: unknown,
): { success: false; result: T; message: string } {
  return {
    success: false,
    result,
    message: resolveSecondErrorMessage(error),
  };
}
