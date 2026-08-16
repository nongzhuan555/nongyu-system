import { API_BASE_URL } from "@/config/env";
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

/**
 * 解析 Agent 模型配置：自有 Key 优先；否则在有 App JWT 时走平台代理。
 */
export async function resolveAgentProviderConfig(): Promise<AgentProviderConfig | null> {
  const user = await loadAgentConfig();
  if (user) {
    return {
      baseURL: user.baseURL,
      apiKey: user.apiKey,
      model: user.model,
      source: "user",
    };
  }

  const token = useSessionStore.getState().token?.trim();
  if (!token) return null;

  return {
    baseURL: `${API_BASE_URL}/api/app/llm/v1`,
    apiKey: token,
    model: PLATFORM_LLM_MODEL,
    source: "platform",
  };
}
