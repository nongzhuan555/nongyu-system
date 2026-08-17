import { useSessionStore } from "@/stores/session";

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
