import type { ChatMessage } from "nongyu-agent-sdk";

export type AgentChatSession = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  lastUsedAt: number;
  messages: ChatMessage[];
  llmSummary?: string;
  llmCompactedUntilId?: string;
};

export type AgentSessionBucket = {
  sessions: AgentChatSession[];
  activeSessionId: string | null;
};

export const AGENT_SESSION_MAX = 10;
export const AGENT_SESSION_TITLE_MAX = 20;
