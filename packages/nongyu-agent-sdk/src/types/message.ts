import type { ToolCall } from './model';

// ===== 消息类型 =====

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
  name?: string;
  timestamp: number;
}
