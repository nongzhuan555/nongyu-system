/**
 * 教务网页抓取工具模块
 * 提供通用的网页内容获取方法
 */

import { get } from "./request";
import type { ExtendedAxiosRequestConfig } from "./request";

/**
 * 抓取教务网 HTML 的通用工具函数
 * 会自动处理：
 * 1. GBK 解码（在请求层完成）
 * 2. Cookie 注入（在请求层完成）
 * 3. 登录失效自动重试（在响应层完成）
 * 
 * @param url 目标教务网页面的完整 URL
 * @param headers 额外的请求头，会合并到默认 headers 中
 * @returns 解码后的 HTML 字符串内容
 * 
 * @example
 * const html = await fetchJiaowuHtml('https://jiaowu.sicau.edu.cn/page.asp');
 */
export const fetchJiaowuHtml = async (url: string, headers?: Record<string, string>): Promise<string> => {
  return get<string>(url, undefined, { headers } as ExtendedAxiosRequestConfig);
}
