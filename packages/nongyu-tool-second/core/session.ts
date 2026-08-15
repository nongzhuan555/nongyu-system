/**
 * 二课会话：学号密码 + x-access-token
 */

const LOGIN_DATA = {
  user: "",
  pwd: "",
};

let accessToken = "";

/**
 * 写入学号密码（供自动重登）
 */
export function setLoginData(user: string, pwd: string): void {
  LOGIN_DATA.user = user;
  LOGIN_DATA.pwd = pwd;
}

/**
 * 读取当前内存凭据
 */
export function getLoginData(): { user: string; pwd: string } {
  return { ...LOGIN_DATA };
}

/**
 * 读取当前 token
 */
export function getAccessToken(): string {
  return accessToken;
}

/**
 * 写入 / 清空 token（冷启动恢复时用）
 */
export function setAccessToken(token: string): void {
  accessToken = token ?? "";
}

/**
 * 清空凭据与 token
 */
export function clearLoginData(): void {
  LOGIN_DATA.user = "";
  LOGIN_DATA.pwd = "";
  accessToken = "";
}
