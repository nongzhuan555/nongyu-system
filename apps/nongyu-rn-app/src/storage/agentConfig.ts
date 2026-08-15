import * as SecureStore from "expo-secure-store";

/**
 * Agent 模型凭据（SecureStore）
 *
 * Key 仅字母数字与 `.` `-` `_`（expo-secure-store 约束）。
 * 登出 / Token 失效本地清会话时必须清空。
 */

const API_KEY_KEY = "agent_api_key";
const BASE_URL_KEY = "agent_base_url";
const MODEL_KEY = "agent_model";

/** 无预设、无已存模型时的兜底 */
export const DEFAULT_AGENT_MODEL = "gpt-4o-mini";

export type AgentConfigStored = {
  baseURL: string;
  apiKey: string;
  /** 模型名；缺省时用 DEFAULT_AGENT_MODEL */
  model: string;
};

/**
 * 读取本地 Agent 配置；缺 baseURL/apiKey 视为未配置
 */
export async function loadAgentConfig(): Promise<AgentConfigStored | null> {
  try {
    const [apiKey, baseURL, model] = await Promise.all([
      SecureStore.getItemAsync(API_KEY_KEY),
      SecureStore.getItemAsync(BASE_URL_KEY),
      SecureStore.getItemAsync(MODEL_KEY),
    ]);
    if (!apiKey?.trim() || !baseURL?.trim()) return null;
    return {
      apiKey: apiKey.trim(),
      baseURL: baseURL.trim(),
      model: model?.trim() || DEFAULT_AGENT_MODEL,
    };
  } catch (error) {
    console.warn("读取 Agent 配置失败:", error);
    return null;
  }
}

/**
 * 是否已完整配置
 */
export async function hasAgentConfig(): Promise<boolean> {
  return (await loadAgentConfig()) != null;
}

/**
 * 写入 Agent 配置
 */
export async function saveAgentConfig(config: AgentConfigStored): Promise<void> {
  const apiKey = config.apiKey.trim();
  const baseURL = config.baseURL.trim().replace(/\/$/, "");
  const model = (config.model || DEFAULT_AGENT_MODEL).trim();
  if (!apiKey || !baseURL) {
    throw new Error("baseURL 与 API Key 均不能为空");
  }
  if (!model) {
    throw new Error("模型名不能为空");
  }
  await Promise.all([
    SecureStore.setItemAsync(API_KEY_KEY, apiKey),
    SecureStore.setItemAsync(BASE_URL_KEY, baseURL),
    SecureStore.setItemAsync(MODEL_KEY, model),
  ]);
}

/**
 * 清除 Agent 配置（登出 / 用户主动清除）
 */
export async function clearAgentConfig(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(API_KEY_KEY),
      SecureStore.deleteItemAsync(BASE_URL_KEY),
      SecureStore.deleteItemAsync(MODEL_KEY),
    ]);
  } catch (error) {
    console.warn("清除 Agent 配置失败:", error);
  }
}
