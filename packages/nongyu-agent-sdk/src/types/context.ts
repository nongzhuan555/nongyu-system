import type { Message } from './message';
import type { ModelProvider, ModelUsage } from './model';

// ===== 上下文结构 =====

export interface AgentContext {
  /** 系统消息 */
  system: SystemMessage;
  /** 消息历史 */
  messages: Message[];
  /** 当前会话元信息 */
  metadata: SessionMetadata;
  /** 摘要缓存 */
  summary?: string;
}

export interface SystemMessage {
  role: 'system';
  content: string;
}

export interface SessionMetadata {
  sessionId: string;
  agentName: string;
  turnCount: number;
  totalTokensUsed: number;
}

// ===== 上下文配置 =====

export interface ContextConfig {
  /** 最大 Token 数，默认 8000 */
  maxTokens: number;
  /** 上下文管理策略 */
  strategy: 'trimming' | 'summarization' | 'hybrid';
  /** 保留最近 N 轮完整对话（裁剪时），默认 6 */
  keepLastNTurns: number;
  /** 当 Token 超过此比例时触发压缩，默认 0.8 */
  compactThreshold: number;
  /** 用于生成摘要的模型 */
  summaryModel?: ModelProvider;
}

// ===== Token 统计 =====

export interface TokenStats {
  totalInput: number;
  totalOutput: number;
  lastPromptTokens: number;
  lastUsage?: ModelUsage;
  limit: number;
  usagePercent: number;
}

// ===== 上下文管理器接口 =====

export interface ContextManager {
  /** 添加消息到上下文 */
  addMessage(message: Message): void;
  /** 获取当前有效上下文 */
  getContext(): Promise<AgentContext>;
  /** 获取当前 Token 统计 */
  getTokenStats(): TokenStats;
  /** 手动触发上下文压缩 */
  compact(): Promise<void>;
  /** 清空上下文（保留系统消息） */
  clear(): void;
  /** 获取会话摘要 */
  getSummary(): string | undefined;
}
