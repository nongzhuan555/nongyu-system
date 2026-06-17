import type { Message } from '../../types/message';
import type {
  ContextManager,
  AgentContext,
  ContextConfig,
  TokenStats,
} from '../../types/context';
import type { ModelUsage } from '../../types/model';
import { TrimmingStrategy } from './strategies/trimming';

const DEFAULT_MAX_TOKENS = 8000;
const DEFAULT_KEEP_LAST_N_TURNS = 6;
const DEFAULT_COMPACT_THRESHOLD = 0.8;

/**
 * 上下文管理器实现
 *
 * 负责管理 Agent 的对话上下文，包括消息存储、Token 统计和上下文压缩。
 * 默认使用裁剪策略（Trimming），保留最近 N 轮对话。
 */
export class ContextManagerImpl implements ContextManager {
  private systemContent: string;
  private messages: Message[] = [];
  private summary: string | undefined;
  private config: Required<Omit<ContextConfig, 'summaryModel'>> & { summaryModel?: ContextConfig['summaryModel'] };
  private stats: TokenStats;
  private sessionId: string;
  private agentName: string;

  constructor(systemPrompt: string, config: ContextConfig = {} as ContextConfig) {
    this.systemContent = systemPrompt;
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.agentName = '';

    this.config = {
      maxTokens: config.maxTokens ?? DEFAULT_MAX_TOKENS,
      strategy: config.strategy ?? 'trimming',
      keepLastNTurns: config.keepLastNTurns ?? DEFAULT_KEEP_LAST_N_TURNS,
      compactThreshold: config.compactThreshold ?? DEFAULT_COMPACT_THRESHOLD,
      summaryModel: config.summaryModel,
    };

    this.stats = {
      totalInput: 0,
      totalOutput: 0,
      lastPromptTokens: 0,
      limit: this.config.maxTokens,
      usagePercent: 0,
    };
  }

  updateAgentName(name: string): void {
    this.agentName = name;
  }

  addMessage(message: Message): void {
    this.messages.push(message);
  }

  async getContext(): Promise<AgentContext> {
    // 检查是否需要压缩
    if (this.stats.usagePercent >= this.config.compactThreshold) {
      await this.compact();
    }

    return {
      system: { role: 'system', content: this.systemContent },
      messages: [...this.messages],
      metadata: {
        sessionId: this.sessionId,
        agentName: this.agentName,
        turnCount: this.messages.length,
        totalTokensUsed: this.stats.totalInput + this.stats.totalOutput,
      },
      summary: this.summary,
    };
  }

  getTokenStats(): TokenStats {
    return { ...this.stats };
  }

  /** 更新 Token 统计（每次 LLM 调用后调用） */
  updateTokenStats(usage: ModelUsage): void {
    this.stats.totalInput += usage.prompt_tokens;
    this.stats.totalOutput += usage.completion_tokens;
    this.stats.lastPromptTokens = usage.prompt_tokens;
    this.stats.lastUsage = usage;
    this.stats.usagePercent = usage.prompt_tokens / this.config.maxTokens;
  }

  async compact(): Promise<void> {
    const _beforeTokens = this.stats.lastPromptTokens;

    switch (this.config.strategy) {
      case 'trimming':
        await this.applyTrimming();
        break;
      case 'summarization':
        // Phase 5 实现
        break;
      case 'hybrid':
        // Phase 5 实现
        break;
    }

    const afterTokens = this.messages.length * 10; // 简单估算
    this.stats.usagePercent = afterTokens / this.config.maxTokens;

    // 更新 lastPromptTokens 反映压缩后的大小
    this.stats.lastPromptTokens = afterTokens;
  }

  private async applyTrimming(): Promise<void> {
    const strategy = new TrimmingStrategy(this.config.keepLastNTurns);
    const systemMessage = { role: 'system' as const, content: this.systemContent };
    const result = await strategy.apply(systemMessage, this.messages, this.summary);
    this.messages = result.messages;
    this.summary = result.summary;
  }

  clear(): void {
    this.messages = [];
    this.summary = undefined;
  }

  getSummary(): string | undefined {
    return this.summary;
  }
}

/**
 * 创建上下文管理器
 */
export function createContextManager(
  systemPrompt: string,
  config?: ContextConfig,
): ContextManagerImpl {
  return new ContextManagerImpl(systemPrompt, config);
}

export { TrimmingStrategy } from './strategies/trimming';
export { TokenStatsTracker } from './token-stats';
