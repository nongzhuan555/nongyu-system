/**
 * 管理台 handoff ticket 短时槽（进程内）
 * 禁止写入 MMKV / 路由参数 / 打开 URL，降低可分享泄漏面
 */
let pendingTicket: string | null = null;

/**
 * 写入待注入的 handoff ticket（打开 WebView 前调用）
 */
export function setPendingAdminHandoffTicket(ticket: string): void {
  const trimmed = ticket.trim();
  pendingTicket = trimmed.length > 0 ? trimmed : null;
}

/**
 * 仅当打开的是管理台 in_app 登录页时取出并清空 ticket，避免误注入其它网页
 */
export function takePendingAdminHandoffTicket(pageUrl: string): string | null {
  if (!pendingTicket) return null;
  try {
    const parsed = new URL(pageUrl);
    const isInAppLogin =
      parsed.searchParams.get("loginType") === "in_app" && /\/login\/?$/i.test(parsed.pathname);
    if (!isInAppLogin) return null;
  } catch {
    return null;
  }
  const ticket = pendingTicket;
  pendingTicket = null;
  return ticket;
}
