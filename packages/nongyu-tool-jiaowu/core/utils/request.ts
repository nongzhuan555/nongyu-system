/**
 * 网络请求封装模块
 * 基于 axios 实现，包含请求拦截、响应拦截、自动重试和自动登录逻辑
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { decodeGbk } from './decode';
import { getCookie, setCookie } from './cookie';

/**
 * 教务网请求的通用 Headers
 * 模拟浏览器环境以通过服务器的基本校验
 */
const COMMON_HEADERS: Record<string, string> = {
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'accept-encoding': 'gzip, deflate, br, zstd',
  'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
  'upgrade-insecure-requests': '1',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0',
};

/**
 * Axios 实例配置
 * 设置超时时间、通用 Header，并指定响应类型为 arraybuffer 以便后续处理 GBK 编码
 */
const service: AxiosInstance = axios.create({
  timeout: 10000,
  headers: COMMON_HEADERS,
  responseType: 'arraybuffer', // 默认返回 arraybuffer 以便手动解码 GBK
});

/**
 * 请求拦截器
 * 在发送请求前自动注入当前有效的 Cookie
 */
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const cookie = getCookie();

    // 自动设置 Referer，许多 ASP 系统以此作为安全校验
    if (config.url && !config.headers['Referer']) {
      config.headers['Referer'] = config.url;
    }

    // 只有在没有手动设置 Cookie 的情况下才注入全局 Cookie
    if (cookie && !config.headers['Cookie']) {
      config.headers['Cookie'] = cookie;
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

/**
 * 扩展 AxiosRequestConfig 接口
 * 添加自定义属性以支持重试计数、登录重试标识以及完整响应控制
 */
export interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  _retryCount?: number;      // 当前重试次数
  _reloginAttempted?: boolean; // 是否已尝试过自动登录
  fullResponse?: boolean;     // 是否返回完整的 AxiosResponse 对象
}

/**
 * 响应拦截器
 * 1. 处理 GBK 解码
 * 2. 检测并处理“登录超时”
 * 3. 错误时触发自动重试逻辑
 */
service.interceptors.response.use(
  async (response: AxiosResponse) => {
    const config = response.config as ExtendedAxiosRequestConfig;
    
    // 如果是登录接口，直接返回，不进行超时判断（避免死循环）
    if (config.url?.includes('check.asp')) {
      return response;
    }

    // 解码响应体为 GBK 字符串
    const responseData = response.data;
    const decodedHtml = decodeGbk(responseData);

    // 判断响应内容是否提示登录超时
    if ((decodedHtml.includes('登录超时') || decodedHtml.includes('账号验证失败'))) {
      if (!config._reloginAttempted) {
        config._reloginAttempted = true;
        console.log('检测到登录超时，尝试重新登录...');
        
        // 先清空现有 cookie，触发 jiaowuLogin 重新获取
        setCookie('');
        
        // 动态导入 jiaowuLogin 以解决循环依赖问题
        const { jiaowuLogin } = await import('../login');
        // 这里重新登录用的是全局变量里的学号密码，无需传参，所以jiaowuLogin成功后必须反填全局登录数据
        const loginResult = await jiaowuLogin();
        
        if (loginResult.success) {
          console.log('重新登录成功，重新发起请求');
          // 更新请求头中的 cookie
          if (config.headers) {
            config.headers['Cookie'] = getCookie();
          }
          // 重新发起刚刚失败的请求
          return service(config);
        } else {
          console.error('重新登录失败');
          return Promise.reject(new Error('登录超时且自动重新登录失败'));
        }
      } else {
        // 已尝试过重新登录但依然超时，停止重试
        return Promise.reject(new Error('登录超时且已尝试过重新登录'));
      }
    }

    // 将解码后的字符串存回 data 字段，供后续业务使用
    response.data = decodedHtml;
    return response;
  },
  async (error) => {
    const config = error.config as ExtendedAxiosRequestConfig;
    
    // 如果是网络错误或其他异常，且重试次数未达上限（默认3次），进行重试
    if (!config || (config._retryCount || 0) >= 3) {
      return Promise.reject(error);
    }

    config._retryCount = (config._retryCount || 0) + 1;
    console.log(`网络错误或请求失败，正在进行第 ${config._retryCount} 次重试...`);
    
    // 延迟 1s 后重试
    await new Promise(resolve => setTimeout(resolve, 1000));
    return service(config);
  }
);

/**
 * 通用请求封装函数
 * 
 * @param config 请求配置对象
 * @returns 根据 config.fullResponse 返回数据内容或完整响应对象
 * 
 * @example
 * const html = await request({ url: '/api/page' });
 * const full = await request({ url: '/api/page', fullResponse: true });
 */
export async function request<T = any>(config: ExtendedAxiosRequestConfig): Promise<T> {
  const response = await service.request(config);
  if (config.fullResponse) {
    return response as any;
  }
  return response.data as T;
}

/**
 * GET 请求便捷方法
 * 
 * @param url 请求地址
 * @param params URL 参数对象
 * @param config 额外配置
 */
export function get<T = any>(url: string, params?: any, config: ExtendedAxiosRequestConfig = {}): Promise<T> {
  return request<T>({
    url,
    method: 'GET',
    params,
    ...config,
  });
}

/**
 * POST 请求便捷方法
 * 
 * @param url 请求地址
 * @param data Body 数据
 * @param config 额外配置
 */
export function post<T = any>(url: string, data?: any, config: ExtendedAxiosRequestConfig = {}): Promise<T> {
  return request<T>({
    url,
    method: 'POST',
    data,
    ...config,
  });
}

export default request;
