/**
 * 工具函数统一导出入口
 */

// 网络请求相关
export { request, get, post, type ExtendedAxiosRequestConfig } from './request';

// 解码相关
export { decodeToText, decodeGbk, encodeGbkUrl } from './decode';

// Cookie 管理
export { getCookie, setCookie } from './cookie';

// 网页抓取
export { fetchJiaowuHtml } from './fetchJiaowuHtml';

// HTML 解析
export * from './html';
