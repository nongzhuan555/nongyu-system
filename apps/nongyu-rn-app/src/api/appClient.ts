import { API_BASE_URL } from "@/config/env";
import { AppApiError, isAuthInvalidCode } from "@/api/appApiError";
import { handleAuthInvalid } from "@/api/handleAuthInvalid";
import { getAppAccessToken } from "@/api/appToken";
import { reportAppRequestError } from "@/modules/telemetry/reportRequest";

type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T | null;
};

type ParseApiResponseOptions = {
  allowNullData?: boolean;
  skipAuthInvalidHandler?: boolean;
  /** 上报用：HTTP method */
  method?: string;
  /** 上报用：pathname（可含 query，上报前会剥掉） */
  path?: string;
};

/**
 * 解析统一响应包；业务失败抛出带 code 的 AppApiError
 * @param allowNullData 登出等接口成功时 data 可为 null
 * @param skipAuthInvalidHandler 冷启动 /me 等自行处理失效时跳过全局清会话
 */
export async function parseApiResponse<T>(
  response: Response,
  options?: ParseApiResponseOptions,
): Promise<T> {
  const method = (options?.method || "GET").toUpperCase();
  const path = options?.path || "/";

  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await response.json()) as ApiEnvelope<T>;
  } catch {
    const message = `农屿接口响应非 JSON (HTTP ${response.status})`;
    reportAppRequestError({
      kind: "network",
      message,
      method,
      path,
      httpStatus: response.status,
    });
    throw new Error(message);
  }

  if (!response.ok || json.code !== 0) {
    const code = json.code;
    const message = json.message || `农屿接口失败 (HTTP ${response.status}, code=${code})`;
    reportAppRequestError({
      kind: "api",
      message,
      method,
      path,
      httpStatus: response.status,
      code,
    });
    if (!options?.skipAuthInvalidHandler && isAuthInvalidCode(code)) {
      void handleAuthInvalid(code);
    }
    throw new AppApiError(code, message, response.status);
  }

  if (json.data == null && !options?.allowNullData) {
    const message = json.message || "农屿接口响应缺少 data";
    reportAppRequestError({
      kind: "network",
      message,
      method,
      path,
      httpStatus: response.status,
    });
    throw new Error(message);
  }

  return json.data as T;
}

export { getAppAccessToken } from "@/api/appToken";

type AppFetchOptions = RequestInit & {
  /** 成功时允许 data 为 null */
  allowNullData?: boolean;
  /** 为 false 时不带鉴权头（公开接口） */
  auth?: boolean;
};

/**
 * 带 Base URL / JSON / App JWT 的统一 fetch
 */
export async function appFetch<T>(path: string, options: AppFetchOptions = {}): Promise<T> {
  const { allowNullData, auth = true, headers, ...init } = options;
  const method = (init.method || "GET").toUpperCase();
  const mergedHeaders = new Headers(headers);

  if (!mergedHeaders.has("Content-Type") && init.body) {
    mergedHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getAppAccessToken();
    if (!token) {
      throw new Error("农屿服务未接通或登录凭证缺失，请下拉重试或重新登录");
    }
    mergedHeaders.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: mergedHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "网络请求失败";
    reportAppRequestError({
      kind: "network",
      message,
      method,
      path,
    });
    throw error;
  }

  return parseApiResponse<T>(response, { allowNullData, method, path });
}
