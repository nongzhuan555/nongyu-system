import { API_BASE_URL } from "@/config/env";
import { resolvePreferredProviderSource } from "@/modules/settings/store/agentProviderSourcePrefsStore";
import { loadAgentConfig } from "@/storage/agentConfig";
import { useSessionStore } from "@/stores/session";

/** 与 Node `LLM_POOL_DEFAULT_MODEL` 默认值对齐 */
export const PLATFORM_LLM_MODEL = "glm-4.7-flash";

export type AgentProviderConfig = {
  baseURL: string;
  apiKey: string;
  model: string;
  source: "user" | "platform";
};

function platformConfig(token: string): AgentProviderConfig {
  return {
    baseURL: `${API_BASE_URL}/api/app/llm/v1`,
    apiKey: token,
    model: PLATFORM_LLM_MODEL,
    source: "platform",
  };
}

/**
 * 解析 Agent 模型配置：按设备级通道偏好；偏好自有但无凭据时回退平台代理。
 */
export async function resolveAgentProviderConfig(): Promise<AgentProviderConfig | null> {
  const user = await loadAgentConfig();
  const pref = resolvePreferredProviderSource(!!user);
  const token = useSessionStore.getState().token?.trim();

  if (pref === "user" && user) {
    return {
      baseURL: user.baseURL,
      apiKey: user.apiKey,
      model: user.model,
      source: "user",
    };
  }

  // pref === "user" 但无凭据，或 pref === "platform"
  if (!token) return null;
  return platformConfig(token);
}
