/**
 * 二课 axios 封装：注入 x-access-token，鉴权失败自动重登并重放一次
 */

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { SECOND_BASE_URL } from "../constants";
import { getAccessToken, setAccessToken } from "../session";
import { isSecondTimeoutError, resolveSecondErrorMessage } from "./errors";
import { isSecondApiOk, looksLikeAuthFailure, type SecondApiEnvelope } from "./types";

export type ExtendedAxiosRequestConfig = AxiosRequestConfig & {
  _retryCount?: number;
  _reloginAttempted?: boolean;
  /** 跳过自动注入 token（登录接口） */
  skipAuth?: boolean;
};

export type SecondHttpLogEvent = {
  ok: boolean;
  method: string;
  url: string;
  status: number | null;
  durationMs: number;
  requestBody: unknown;
  responseBody: unknown;
  errorMessage: string | null;
  hasToken: boolean;
};

let httpLogger: ((event: SecondHttpLogEvent) => void) | undefined;

/**
 * 注册开发态 HTTP 结算回调
 */
export function attachSecondHttpLogger(onSettled: (event: SecondHttpLogEvent) => void): void {
  httpLogger = onSettled;
}

function headerHas(headers: AxiosRequestConfig["headers"], name: string): boolean {
  if (!headers) return false;
  const getter = (headers as { get?: (key: string) => unknown }).get;
  if (typeof getter === "function") {
    const value = getter.call(headers, name);
    return value != null && value !== "";
  }
  const record = headers as Record<string, unknown>;
  return (record[name] ?? record[name.toLowerCase()]) != null;
}

const service: AxiosInstance = axios.create({
  baseURL: SECOND_BASE_URL,
  timeout: 20000,
  headers: {
    Accept: "application/json",
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  },
});

service.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const extended = config as InternalAxiosRequestConfig & ExtendedAxiosRequestConfig;
  if (!extended.skipAuth) {
    const token = getAccessToken();
    if (token && !headerHas(config.headers, "x-access-token")) {
      config.headers.set("x-access-token", token);
    }
  }
  return config;
});

service.interceptors.response.use(
  async (response: AxiosResponse) => {
    const config = response.config as ExtendedAxiosRequestConfig;
    const data = response.data as SecondApiEnvelope | undefined;
    const msg = data && typeof data === "object" ? data.message : undefined;
    const code = data && typeof data === "object" ? data.code : undefined;

    if (!config.skipAuth && !config._reloginAttempted && looksLikeAuthFailure(msg, code)) {
      config._reloginAttempted = true;
      const { secondLogin } = await import("../login");
      const loginResult = await secondLogin();
      if (loginResult.success && loginResult.token) {
        if (config.headers) {
          (config.headers as Record<string, string>)["x-access-token"] = loginResult.token;
        }
        return service(config);
      }
      return Promise.reject(new Error(loginResult.message || "登录失效且自动重登失败"));
    }

    return response;
  },
  async (error) => {
    const config = error.config as ExtendedAxiosRequestConfig | undefined;
    if (config && (config._retryCount || 0) < 3) {
      config._retryCount = (config._retryCount || 0) + 1;
      await new Promise((r) => setTimeout(r, 1000));
      return service(config);
    }
    if (isSecondTimeoutError(error)) {
      return Promise.reject(new Error(resolveSecondErrorMessage(error)));
    }
    return Promise.reject(error);
  },
);

function emitLog(event: SecondHttpLogEvent): void {
  if (!httpLogger) return;
  try {
    httpLogger(event);
  } catch {
    // ignore
  }
}

/**
 * 底层 request
 */
export async function request<T = unknown>(config: ExtendedAxiosRequestConfig): Promise<T> {
  const startedAt = Date.now();
  try {
    const response = await service.request(config);
    emitLog({
      ok: true,
      method: (config.method ?? "GET").toUpperCase(),
      url: axios.getUri({ ...config, baseURL: SECOND_BASE_URL }),
      status: response.status,
      durationMs: Date.now() - startedAt,
      requestBody: config.data ?? config.params,
      responseBody: response.data,
      errorMessage: null,
      hasToken: Boolean(getAccessToken()),
    });
    return response.data as T;
  } catch (error: unknown) {
    const axiosError = error as {
      config?: ExtendedAxiosRequestConfig;
      response?: { status?: number; data?: unknown };
      message?: string;
    };
    emitLog({
      ok: false,
      method: (config.method ?? "GET").toUpperCase(),
      url: axios.getUri({ ...config, baseURL: SECOND_BASE_URL }),
      status: axiosError.response?.status ?? null,
      durationMs: Date.now() - startedAt,
      requestBody: config.data ?? config.params,
      responseBody: axiosError.response?.data,
      errorMessage: axiosError.message ?? String(error),
      hasToken: Boolean(getAccessToken()),
    });
    throw error;
  }
}

/**
 * POST（query 参数，对齐旧版 i川农调用方式）
 */
export function postQuery<T = unknown>(
  path: string,
  params?: Record<string, string | number | undefined | null>,
  config: ExtendedAxiosRequestConfig = {},
): Promise<T> {
  const cleaned: Record<string, string | number> = {};
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      cleaned[k] = v;
    }
  }
  return request<T>({
    url: path,
    method: "POST",
    params: cleaned,
    ...config,
  });
}

/**
 * 解析信封；成功时可选回写 token（登录）
 */
export function unwrapEnvelope<T>(
  envelope: SecondApiEnvelope<T>,
  empty: T,
): { ok: true; data: T; message: string } | { ok: false; data: T; message: string } {
  if (!envelope || typeof envelope !== "object") {
    return { ok: false, data: empty, message: "响应格式异常" };
  }
  if (!isSecondApiOk(envelope.code)) {
    return {
      ok: false,
      data: empty,
      message: envelope.message || `业务失败 code=${String(envelope.code)}`,
    };
  }
  return {
    ok: true,
    data: (envelope.content ?? empty) as T,
    message: envelope.message || "成功",
  };
}

/** 供登录成功后同步内存 token（避免循环依赖细节泄漏） */
export { setAccessToken };
