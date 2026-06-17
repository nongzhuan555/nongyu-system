/**
 * Cookie 管理模块
 * 负责全局 Cookie 的存储、读取和更新
 */

/**
 * 全局 Cookie 变量
 * 格式通常为：ASPSESSIONIDXXXXXXXX=YYYYYYYYYYYYYYYYYYYYYYYY
 * 该 Cookie 用于教务系统的身份验证，在有效期内无需重新登录
 */
let globalCookie = '';

/**
 * 获取当前存储的全局 Cookie
 * 
 * @returns 当前有效的 Cookie 字符串
 */
export const getCookie = () => {
  return globalCookie;
}

/**
 * 设置或更新全局 Cookie
 * 
 * @param cookie 新的 Cookie 字符串
 */
export const setCookie = (cookie: string) => {
  globalCookie = cookie;
}
