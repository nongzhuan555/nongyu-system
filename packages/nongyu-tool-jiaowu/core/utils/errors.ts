/**
 * 教务请求错误辅助
 */

/** 教务网不可达（常见于超时）时的用户提示 */
export const JIAOWU_CAMPUS_NETWORK_HINT = "教务网迁入内网，可尝试连接校园网使用农屿";

/**
 * 判断是否为请求超时类错误（含 axios ECONNABORTED）
 */
export function isJiaowuTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    const msg = String(error ?? "");
    return /timeout/i.test(msg);
  }

  const err = error as { code?: string; message?: string; cause?: unknown };
  if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT" || err.code === "ESOCKETTIMEDOUT") {
    return true;
  }
  if (typeof err.message === "string" && /timeout/i.test(err.message)) {
    return true;
  }
  if (err.cause) {
    return isJiaowuTimeoutError(err.cause);
  }
  return false;
}

/**
 * 从异常生成面向调用方的 message；超时时固定返回校园网提示
 */
export function resolveJiaowuErrorMessage(error: unknown, fallback = "请求失败"): string {
  if (isJiaowuTimeoutError(error)) {
    return JIAOWU_CAMPUS_NETWORK_HINT;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return fallback;
}

/**
 * 构造带 success/result/message 的失败返回（超时时附带校园网提示）
 */
export function jiaowuFailResult<T>(
  result: T,
  error: unknown,
): {
  success: false;
  result: T;
  message: string;
} {
  return {
    success: false,
    result,
    message: resolveJiaowuErrorMessage(error),
  };
}
