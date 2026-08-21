import { STORAGE_AGENT_CONFIG_KEY } from "../../lib/constants";

export const DEFAULT_AGENT_MODEL = "deepseek-v4-flash";

export type AgentConfigStored = {
  baseURL: string;
  apiKey: string;
  model: string;
};

export function loadAgentConfig(): AgentConfigStored | null {
  try {
    const raw = localStorage.getItem(STORAGE_AGENT_CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AgentConfigStored;
    if (!parsed.apiKey?.trim() || !parsed.baseURL?.trim()) return null;
    return {
      apiKey: parsed.apiKey.trim(),
      baseURL: parsed.baseURL.trim().replace(/\/$/, ""),
      model: parsed.model?.trim() || DEFAULT_AGENT_MODEL,
    };
  } catch {
    return null;
  }
}

export function saveAgentConfig(config: AgentConfigStored): void {
  const apiKey = config.apiKey.trim();
  const baseURL = config.baseURL.trim().replace(/\/$/, "");
  const model = (config.model || DEFAULT_AGENT_MODEL).trim();
  if (!apiKey || !baseURL) {
    throw new Error("baseURL 与 API Key 均不能为空");
  }
  localStorage.setItem(STORAGE_AGENT_CONFIG_KEY, JSON.stringify({ apiKey, baseURL, model }));
}

export function clearAgentConfig(): void {
  try {
    localStorage.removeItem(STORAGE_AGENT_CONFIG_KEY);
  } catch {
    // ignore
  }
}
