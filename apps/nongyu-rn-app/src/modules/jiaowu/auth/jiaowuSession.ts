import {
  clearLoginData,
  getCookie,
  jiaowuLogin,
  setCookie,
  setLoginData,
} from "nongyu-tool-jiaowu";
import { clearJiaowuAspCookie, getJiaowuAspCookie, setJiaowuAspCookie } from "@/storage/mmkv";

/**
 * 将学号密码写入工具内存 LOGIN_DATA
 */
export function bridgeSetLoginData(studentId: string, password: string): void {
  setLoginData(studentId, password);
}

/**
 * 执行教务登录；成功时顺带把 Cookie 备份到 MMKV
 */
export async function bridgeJiaowuLogin(studentId?: string, password?: string) {
  const result = await jiaowuLogin(studentId, password);
  if (result.success && result.cookie) {
    setJiaowuAspCookie(result.cookie);
  }
  return result;
}

/**
 * 冷启动：从 MMKV 恢复 ASP Cookie 到工具内存
 */
export function restoreAspCookieFromStorage(): boolean {
  const cookie = getJiaowuAspCookie();
  if (!cookie) return false;
  setCookie(cookie);
  return true;
}

/**
 * 将当前工具内存 Cookie 同步到 MMKV
 */
export function persistCurrentAspCookie(): void {
  const cookie = getCookie();
  if (cookie) {
    setJiaowuAspCookie(cookie);
  }
}

/**
 * 清空工具侧登录态与本地 Cookie 备份
 */
export function clearJiaowuToolSession(): void {
  clearLoginData();
  clearJiaowuAspCookie();
}
