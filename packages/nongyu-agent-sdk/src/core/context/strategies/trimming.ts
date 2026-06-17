import type { Message } from '../../../types/message';

/**
 * 裁剪策略：保留最近 N 轮完整对话
 *
 * 流程：
 * 1. 保留 system 消息 + summary + 最近 keepLastNTurns 轮消息
 * 2. 丢弃其余旧消息
 */
export class TrimmingStrategy {
  constructor(private keepLastNTurns: number) {}

  async apply(
    systemMessage: { role: 'system'; content: string },
    messages: Message[],
    summary?: string,
  ): Promise<{ messages: Message[]; summary?: string }> {
    // 计算用户消息数量，确定"轮"
    const userIndices: number[] = [];
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role === 'user') {
        userIndices.push(i);
      }
    }

    // 如果用户消息数不足保留数，无需裁剪
    if (userIndices.length <= this.keepLastNTurns) {
      return { messages: [...messages], summary };
    }

    // 从保留的最后一轮开始裁剪
    const keepFromIndex = userIndices[userIndices.length - this.keepLastNTurns];
    const keptMessages = messages.slice(keepFromIndex);

    // 如果配置了摘要，可以在最后一轮前插入摘要（由外部处理）

    return {
      messages: keptMessages,
      summary,
    };
  }
}
