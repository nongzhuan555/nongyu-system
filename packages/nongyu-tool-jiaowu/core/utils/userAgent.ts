/**
 * 教务请求 User-Agent：优先用运行时环境，避免写死桌面/机型串
 *
 * RN / 浏览器：读 navigator.userAgent（Hermes 有 polyfill，一般是系统 WebView 串）
 * Node 测试：没有 navigator 时才用回退串
 */

/** 仅 Node 等无 navigator 环境使用，不作为 App 真机主路径 */
const FALLBACK_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36";

let userAgentOverride: string | undefined;

/**
 * 可选覆盖。空字符串表示取消覆盖，回到环境探测。
 */
export function setJiaowuUserAgent(userAgent: string): void {
  const trimmed = userAgent.trim();
  userAgentOverride = trimmed || undefined;
}

/**
 * 解析本次请求应带的 User-Agent：覆盖值 → navigator → 回退串
 */
export function resolveJiaowuUserAgent(): string {
  if (userAgentOverride) return userAgentOverride;

  const runtimeUa =
    typeof navigator !== "undefined" && typeof navigator.userAgent === "string"
      ? navigator.userAgent.trim()
      : "";
  if (runtimeUa) return runtimeUa;

  return FALLBACK_USER_AGENT;
}
