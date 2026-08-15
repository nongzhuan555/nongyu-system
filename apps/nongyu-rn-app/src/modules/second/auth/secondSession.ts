import {
  clearLoginData,
  getAccessToken,
  secondLogin,
  setAccessToken,
  setLoginData,
} from "nongyu-tool-second";
import { clearSecondAccessToken, getSecondAccessToken, setSecondAccessToken } from "@/storage/mmkv";

/**
 * 写入二课登录凭据到工具内存
 */
export function bridgeSetSecondLoginData(studentId: string, password: string): void {
  setLoginData(studentId, password);
}

/**
 * 执行二课登录并备份 token
 */
export async function bridgeSecondLogin(studentId?: string, password?: string) {
  const result = await secondLogin(studentId, password);
  if (result.success && result.token) {
    setSecondAccessToken(result.token);
  }
  return result;
}

/**
 * 冷启动：恢复 token 到工具内存
 */
export function restoreSecondTokenFromStorage(): boolean {
  const token = getSecondAccessToken();
  if (!token) return false;
  setAccessToken(token);
  return true;
}

/**
 * 将当前内存 token 同步到 MMKV
 */
export function persistCurrentSecondToken(): void {
  const token = getAccessToken();
  if (token) setSecondAccessToken(token);
}

/**
 * 清空二课工具会话与本地 token
 */
export function clearSecondToolSession(): void {
  clearLoginData();
  clearSecondAccessToken();
}
