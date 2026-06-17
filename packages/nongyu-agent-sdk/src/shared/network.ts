/**
 * Agent SDK 网络基建
 *
 * 提供跨平台的 HTTP 请求封装。在浏览器环境使用 fetch，
 * 在 Node.js 环境使用 fetch (Node 18+ 内置)。
 */

export interface RequestOptions {
  method: 'GET' | 'POST'; // 只用 GET 和 POST 方法
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
  timeout?: number;
}

/**
 * 发起 HTTP 请求并解析 JSON 响应
 */
export async function request<T = unknown>(
  url: string,
  options: RequestOptions,
): Promise<T> {
  const controller = new AbortController();
  const signal = options.signal ?? controller.signal;

  // 超时控制，超时后自动取消请求
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  if (options.timeout) {
    timeoutId = setTimeout(() => controller.abort(), options.timeout);
  }

  try {
    const response = await fetch(url, {
      method: options.method,
      headers: options.headers,
      body: options.body,
      signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    return (await response.json()) as T;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
