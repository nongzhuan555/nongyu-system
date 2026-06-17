/**
 * 教务登录模块
 * 负责维护用户凭据、执行登录请求以及生成/管理会话 Cookie
 */

import { post, setCookie, type ExtendedAxiosRequestConfig } from '../utils';
import { AxiosResponse } from 'axios';

/**
 * 内部存储的全局登录凭据
 */
const LOGIN_DATA = {
    user: '', // 学号
    pwd: '',  // 密码
}

/**
 * 设置全局登录数据，内部测试用，模拟登录
 */
export const setLoginData = (user: string, pwd: string) => {
    LOGIN_DATA.user = user;
    LOGIN_DATA.pwd = pwd;
}

/**
 * 获取当前存储的全局登录数据
 */
export const getLoginData = () => {
    return LOGIN_DATA;
}

/**
 * 教务网登录校验接口地址
 */
const LOGIN_ENDPOINT = 'https://jiaowu.sicau.edu.cn/jiaoshi/bangong/check.asp';

/**
 * 教务网登录所需的固定请求参数
 */
const FIXED_PARAMS = {
    lb: 'S',        
    submit: '',     
    sign: 'e7a39b3bc356c6ccfd2736fb570cf0', 
    hour_key: '819929348661855286025327972118498133047381331063899536918199759489377416899358818930337690620558866971528661981289306036893755569067971881335133'
};

/**
 * 登录会话 Cookie 的前缀
 */
const COOKIE_PREFIX = 'ASPSESSIONID'

/**
 * 构造一个随机的 24 位 Cookie 字符串
 */
function createJiaowuLoginCookie(length = 24): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let cookie = '';
    for (let i = 0; i < length; i += 1) {
        cookie += chars[Math.floor(Math.random() * chars.length)];
    }
    return cookie;
}

/**
 * 从响应头中提取所有 ASPSESSIONID 类型的 Cookie
 */
function extractCookiesFromHeaders(headers: any): string[] {
    const setCookie = headers?.['set-cookie'] || headers?.['Set-Cookie'];
    if (!setCookie) return [];
    
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
    return cookies
        .map(c => c.split(';')[0])
        .filter(c => c.includes(COOKIE_PREFIX));
}

/**
 * 四川农业大学教务系统登录函数。
 * 
 * 向教务系统发送登录请求，成功时返回服务器下发的 Cookie，此 Cookie 用于后续鉴权请求。
 * 失败时返回错误信息。
 * 使用场景：
 * 1. 农屿App登录页，校验通过后农屿本地存学号和密码
 * 
 * @param user - 学号/用户名，不传则使用内置默认值
 * @param pwd  - 密码，不传则使用内置默认值
 * 
 * @returns 成功返回 `{ success: true, cookie: string }`，失败返回 `{ success: false, message: string }`
 * 
 * @example 基本调用
 * ```ts
 * // 不传参数，使用内置默认账号密码
 * const result = await jiaowuLogin();
 * ```
 * 
 * @example 成功示例
 * ```ts
 * const result = await jiaowuLogin('20210001', 'mypassword');
 * // {
 * //   success: true,
 * //   cookie: 'ASPSESSIONIDCEQTSTBS=ABCDEFGHIJKLMNOPQRSTUVWX'
 * // }
 * ```
 * 
 * @example 失败示例 - 账号密码错误
 * ```ts
 * const result = await jiaowuLogin('20210001', 'wrong_pwd');
 * // {
 * //   success: false,
 * //   message: '登录失败，可能是学号密码错误或接口变动'
 * // }
 * ```
 * 
 * @example 失败示例 - 未提供凭据
 * ```ts
 * const result = await jiaowuLogin('', '');
 * // {
 * //   success: false,
 * //   message: '未提供用户名或密码'
 * // }
 * ```
 * 
 * @example 失败示例 - 网络异常
 * ```ts
 * const result = await jiaowuLogin('20210001', 'mypassword');
 * // {
 * //   success: false,
 * //   message: '登录异常: Network Error'
 * // }
 * ```
 */
export async function jiaowuLogin(user?: string, pwd?: string) {
    const finalUser = user || LOGIN_DATA.user;
    const finalPwd = pwd || LOGIN_DATA.pwd;

    if (!finalUser || !finalPwd) {
        return { success: false, message: '未提供用户名或密码' };
    }

    // 严格遵循旧代码的参数顺序
    const params = new URLSearchParams();
    params.append('user', finalUser);
    params.append('pwd', finalPwd);
    Object.entries(FIXED_PARAMS).forEach(([k, v]) => params.append(k, v));
    
    // 准备初始 Cookie
    // 注意：旧代码中使用了特定的后缀 CEQTSTBS
    const initialCookieKey = `${COOKIE_PREFIX}CEQTSTBS`;
    const initialCookie = `${initialCookieKey}=${createJiaowuLoginCookie()}`;

    try {
        const response = await post(LOGIN_ENDPOINT, params.toString(), {
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': initialCookie,
                'Origin': 'https://jiaowu.sicau.edu.cn',
                'Referer': 'https://jiaowu.sicau.edu.cn/web/web/web/index.asp' // 模拟来源页
            },
            fullResponse: true,
            maxRedirects: 0, 
            validateStatus: (status) => status >= 200 && status < 400,
        } as ExtendedAxiosRequestConfig) as unknown as AxiosResponse;

        const resultText = response.data;
        const isRedirect = response.status >= 300 && response.status < 400;
        const isFailed = typeof resultText === 'string' && 
                        resultText.trim().toLowerCase().startsWith('<script language=javascript');

        if (isRedirect || !isFailed) {
            // 提取服务器返回的所有相关 Cookie
            const serverCookies = extractCookiesFromHeaders(response.headers);
            
            // 优先使用服务器返回的，如果没有则使用初始生成的
            // 如果有多个，用分号连接
            let finalCookie = initialCookie;
            if (serverCookies.length > 0) {
                // 如果服务器返回了包含我们要找的那个 key 的 cookie，则更新它
                const targetServerCookie = serverCookies.find(c => c.startsWith(initialCookieKey));
                finalCookie = targetServerCookie || serverCookies[0]; 
            }
            
            setCookie(finalCookie);
            // 登录成功，也反填全局登录数据
            setLoginData(finalUser, finalPwd);

            return { success: true, cookie: finalCookie };
        }
        
        return { success: false, message: '登录失败，可能是学号密码错误或接口变动' };
    } catch (error: any) {
        console.error('登录请求异常:', error.message);
        return { success: false, message: `登录异常: ${error.message}` };
    }
}
