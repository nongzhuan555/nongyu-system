import type { TokenStats } from '../../types/context';
import type { ModelUsage } from '../../types/model';

/**
 * Token 统计跟踪器
 *
 * 基于 LLM 每次响应返回的 usage 信息进行准确的 Token 计数。
 * 不依赖任何第三方 Tokenizer。
 */
export class TokenStatsTracker {
  private stats: TokenStats;

  constructor(limit: number = 8000) {
    this.stats = {
      totalInput: 0,
      totalOutput: 0,
      lastPromptTokens: 0,
      limit,
      usagePercent: 0,
    };
  }

  /** 记录一次 LLM 调用的 Token 使用 */
  record(usage: ModelUsage): void {
    this.stats.totalInput += usage.prompt_tokens;
    this.stats.totalOutput += usage.completion_tokens;
    this.stats.lastPromptTokens = usage.prompt_tokens;
    this.stats.lastUsage = usage;
    this.stats.usagePercent = usage.prompt_tokens / this.stats.limit;
  }

  /** 获取当前统计 */
  getStats(): Readonly<TokenStats> {
    return this.stats;
  }

  /** 判断是否需要压缩 */
  needsCompact(threshold: number = 0.8): boolean {
    return this.stats.usagePercent >= threshold;
  }

  /** 重置统计 */
  reset(): void {
    this.stats.totalInput = 0;
    this.stats.totalOutput = 0;
    this.stats.lastPromptTokens = 0;
    this.stats.lastUsage = undefined;
    this.stats.usagePercent = 0;
  }
}
