import { appFetch } from "@/api/appClient";
import { AppApiError } from "@/api/appApiError";

export type AppHandoffResult = {
  ticket: string;
  expiresIn: number;
};

/**
 * POST /api/admin/auth/app-handoff —— App JWT 换管理台短时 ticket
 */
export async function requestAdminHandoff(): Promise<AppHandoffResult> {
  return appFetch<AppHandoffResult>("/api/admin/auth/app-handoff", {
    method: "POST",
    body: "{}",
  });
}

/** 管理端部署根（登录子路径 /login） */
export const ADMIN_WEB_BASE_URL = "http://101.43.34.229/admin";

/**
 * 构造带 handoff 参数的管理台登录 URL
 */
export function buildAdminHandoffUrl(ticket: string): string {
  const url = new URL(`${ADMIN_WEB_BASE_URL}/login`);
  url.searchParams.set("loginType", "in_app");
  url.searchParams.set("ticket", ticket);
  return url.toString();
}

/**
 * handoff 失败 Toast 文案（对齐 Spec）
 */
export function getAdminHandoffErrorMessage(error: unknown): string {
  if (error instanceof AppApiError) {
    if (error.code === 40302) return "需要管理员权限";
    if (error.code === 40301) return "账号已禁用";
    if (
      error.code === 40101 ||
      error.code === 40102 ||
      error.code === 40103 ||
      error.code === 40104
    ) {
      return "登录已失效，请重新登录";
    }
  }
  if (error instanceof Error && /网络|Network|Failed to fetch/i.test(error.message)) {
    return "网络异常，请稍后重试";
  }
  return "打开管理台失败";
}
