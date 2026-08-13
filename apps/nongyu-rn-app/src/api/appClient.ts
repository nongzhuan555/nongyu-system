import { API_BASE_URL } from "@/config/env";
import { useSessionStore } from "@/stores/session";

type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T | null;
};

/**
 * 解析统一响应包；业务失败抛出带 message 的 Error
 * @param allowNullData 登出等接口成功时 data 可为 null
 */
export async function parseApiResponse<T>(
  response: Response,
  options?: { allowNullData?: boolean },
): Promise<T> {
  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error(`农屿接口响应非 JSON (HTTP ${response.status})`);
  }

  if (!response.ok || json.code !== 0) {
    throw new Error(json.message || `农屿接口失败 (HTTP ${response.status}, code=${json.code})`);
  }

  if (json.data == null && !options?.allowNullData) {
    throw new Error(json.message || "农屿接口响应缺少 data");
  }

  return json.data as T;
}

/**
 * 解析当前可用的 App JWT
 * 优先 session；仅开发环境可回落到 EXPO_PUBLIC_DEV_APP_TOKEN
 */
export function getAppAccessToken(): string | null {
  const sessionToken = useSessionStore.getState().token;
  if (sessionToken) return sessionToken;

  if (__DEV__) {
    const devToken = process.env.EXPO_PUBLIC_DEV_APP_TOKEN?.trim();
    if (devToken) return devToken;
  }

  return null;
}

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
  const mergedHeaders = new Headers(headers);

  if (!mergedHeaders.has("Content-Type") && init.body) {
    mergedHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getAppAccessToken();
    if (!token) {
      throw new Error("未登录或缺少联调 Token，无法请求农屿接口");
    }
    mergedHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: mergedHeaders,
  });

  return parseApiResponse<T>(response, { allowNullData });
}
