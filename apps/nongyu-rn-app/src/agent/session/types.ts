import type { ChatMessage } from "nongyu-agent-sdk";

/** 单条已落盘的 Agent 会话 */
export type AgentChatSession = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  /** LRU；打开或发用户消息时更新 */
  lastUsedAt: number;
  messages: ChatMessage[];
  /** 模型侧会话摘要；压缩失败不写入 */
  llmSummary?: string;
  /** 该 UI 消息及之前已从模型窗口移除 */
  llmCompactedUntilId?: string;
};

/** 每学号会话桶（列表 + 活跃 id） */
export type AgentSessionBucket = {
  sessions: AgentChatSession[];
  activeSessionId: string | null;
};

export const AGENT_SESSION_MAX = 10;

/** 标题截断长度（字符） */
export const AGENT_SESSION_TITLE_MAX = 20;
