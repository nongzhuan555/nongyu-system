// Gateway.ts
import { ChannelPlugin, InboundEnvelope, OutboundEnvelope } from '../../types/channel';

export class Gateway {
  private channels: Map<string, ChannelPlugin> = new Map();
  private messageHandlers: Array<(envelope: InboundEnvelope) => Promise<void>> = [];

  // 注册通道插件
  registerChannel(channel: ChannelPlugin): void {
    this.channels.set(channel.meta.id, channel);
    
    // 注册消息处理器
    if (channel.onMessage) {
      channel.onMessage(async (envelope) => {
        await this.handleInboundMessage(envelope);
      });
    }
    
    console.log(`[Gateway] 注册通道: ${channel.meta.name}`);
  }

  // 启动所有通道
  async start(): Promise<void> {
    for (const [_id, channel] of this.channels) {
      await channel.start();
      console.log(`[Gateway] 通道已启动: ${channel.meta.name}`);
    }
    console.log('[Gateway] 网关启动成功');
  }

  // 停止所有通道
  async stop(): Promise<void> {
    for (const [_id, channel] of this.channels) {
      await channel.stop();
      console.log(`[Gateway] 通道已停止: ${channel.meta.name}`);
    }
    console.log('[Gateway] 网关已停止');
  }

  // 处理入站消息
  private async handleInboundMessage(envelope: InboundEnvelope): Promise<void> {
    console.log(`[Gateway] 收到消息 [${envelope.channel}] ${envelope.from.name}: ${envelope.text}`);
    
    // 调用所有注册的消息处理器
    for (const handler of this.messageHandlers) {
      await handler(envelope);
    }
  }

  // 注册消息处理器（供 Agent 使用）
  onMessage(handler: (envelope: InboundEnvelope) => Promise<void>): void {
    this.messageHandlers.push(handler);
  }

  // 发送出站消息（供 Agent 使用）
  async send(envelope: OutboundEnvelope): Promise<void> {
    const channel = this.resolveChannel(envelope.conversationId);
    await channel.send(envelope);
  }

  // 流式发送出站消息（供 Agent 使用）
  async sendStream(conversationId: string, stream: AsyncIterable<OutboundEnvelope>): Promise<void> {
    const channel = this.resolveChannel(conversationId);
    if (channel.sendStream) {
      await channel.sendStream(stream);
    } else {
      // 降级：收集所有块合并为一条完整消息
      let content = '';
      for await (const chunk of stream) {
        content += chunk.content;
      }
      await channel.send({ conversationId, content });
    }
  }

  // 从 conversationId 解析通道
  private resolveChannel(conversationId: string): ChannelPlugin {
    const channelId = conversationId.split(':')[0];
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`通道未找到: ${channelId}`);
    }
    return channel;
  }
}