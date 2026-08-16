import { ADMIN_LLM_CHAT_PREFIX, PLATFORM_LLM_MODEL } from "../lib/constants";
import { loadAgentConfig } from "./storage/agentConfig";
import { useAuthStore } from "../stores/authStore";

export type AdminAgentProviderConfig = {
  baseURL: string;
  apiKey: string;
  model: string;
  source: "user" | "platform";
};

function apiOrigin(): string {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!raw) return "";
  return raw.replace(/\/$/, "");
}

/** 自有 Key 优先，否则用 Admin JWT 走平台代理。 */
export function resolveAdminAgentProvider(): AdminAgentProviderConfig | null {
  const user = loadAgentConfig();
  if (user) {
    return { ...user, source: "user" };
  }
  const token = useAuthStore.getState().token?.trim();
  if (!token) return null;
  return {
    baseURL: `${apiOrigin()}${ADMIN_LLM_CHAT_PREFIX}`,
    apiKey: token,
    model: PLATFORM_LLM_MODEL,
    source: "platform",
  };
}
