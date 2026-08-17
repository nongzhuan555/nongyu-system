import { create } from "zustand";
import { AGENT_PROVIDER_SOURCE_KEY, appStorage } from "@/storage/mmkv";

/** platform = 农屿后台代理；user = 自有 API Key */
export type AgentProviderSourcePref = "platform" | "user";

/**
 * 读取显式写入的通道偏好；未写入返回 null（由调用方按凭据推导）
 */
export function getAgentProviderSourcePref(): AgentProviderSourcePref | null {
  const raw = appStorage.getString(AGENT_PROVIDER_SOURCE_KEY);
  if (raw === "platform" || raw === "user") return raw;
  return null;
}

/**
 * 有效通道：有显式偏好则用之；否则有自有凭据 → user，否则 → platform。
 * 注意：偏好为 user 但无凭据时，调用方（resolve）还需回退 platform。
 */
export function resolvePreferredProviderSource(hasUserConfig: boolean): AgentProviderSourcePref {
  const stored = getAgentProviderSourcePref();
  if (stored != null) return stored;
  return hasUserConfig ? "user" : "platform";
}

/**
 * 设置页展示用选中态：无凭据时不可展示为「自有 Key」选中（回退视觉到农屿后台）。
 */
export function resolveEffectiveProviderSourceForUi(
  hasUserConfig: boolean,
  stored: AgentProviderSourcePref | null = getAgentProviderSourcePref(),
): AgentProviderSourcePref {
  const preferred = stored ?? (hasUserConfig ? "user" : "platform");
  if (preferred === "user" && !hasUserConfig) return "platform";
  return preferred;
}

type AgentProviderSourcePrefsState = {
  /** 显式偏好；null 表示从未写入 */
  storedSource: AgentProviderSourcePref | null;
  setProviderSource: (value: AgentProviderSourcePref) => void;
};

/**
 * Agent 模型通道偏好（设备级，登出 / 清除 API Key 不重置）
 */
export const useAgentProviderSourcePrefsStore = create<AgentProviderSourcePrefsState>((set) => ({
  storedSource: getAgentProviderSourcePref(),
  setProviderSource: (value) => {
    appStorage.set(AGENT_PROVIDER_SOURCE_KEY, value);
    set({ storedSource: value });
  },
}));
