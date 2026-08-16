import { create } from "zustand";
import { AGENT_CONTEXT_MODE_KEY, appStorage } from "@/storage/mmkv";

/** full = 带会话历史；stateless = 仅当前问题 + 系统提示 */
export type AgentContextMode = "full" | "stateless";

function readContextMode(): AgentContextMode {
  const raw = appStorage.getString(AGENT_CONTEXT_MODE_KEY);
  if (raw === "stateless") return "stateless";
  return "full";
}

type AgentContextPrefsState = {
  contextMode: AgentContextMode;
  setContextMode: (value: AgentContextMode) => void;
};

/**
 * Agent 上下文管理模式（设备级，登出 / 清除 API Key 不重置）
 */
export const useAgentContextPrefsStore = create<AgentContextPrefsState>((set) => ({
  contextMode: readContextMode(),
  setContextMode: (value) => {
    appStorage.set(AGENT_CONTEXT_MODE_KEY, value);
    set({ contextMode: value });
  },
}));

/** 非 React 路径（Runner）读取当前模式 */
export function getAgentContextMode(): AgentContextMode {
  return readContextMode();
}
