/**
 * 二课 API 通用响应与结果类型
 */

export type SecondApiEnvelope<T = unknown> = {
  code: string;
  message: string;
  content: T;
};

export type SecondOk<T> = { success: true; result: T; message?: string };
export type SecondFail<T> = { success: false; result: T; message: string };
export type SecondResult<T> = SecondOk<T> | SecondFail<T>;

/**
 * 业务 code 是否成功（i川农约定 "0"）
 */
export function isSecondApiOk(code: unknown): boolean {
  return code === "0" || code === 0;
}

/**
 * 是否像鉴权失效（触发自动重登）
 * 对齐旧版：业务 code=5「用户过期」；并保留 401/403 与文案兜底
 */
export function looksLikeAuthFailure(message: string | undefined, code: unknown): boolean {
  if (isSecondApiOk(code)) return false;
  if (code === 5 || code === "5") return true;
  if (code === "401" || code === 401 || code === "403" || code === 403) return true;
  const text = (message ?? "").trim();
  if (!text) return false;
  return /token|登录|未登录|过期|失效|重新登录|无权限|鉴权/i.test(text);
}
