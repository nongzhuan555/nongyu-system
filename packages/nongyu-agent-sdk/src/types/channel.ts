// 渠道元数据
export interface ChannelMeta {
  id: string;
  name: string;
  description: string;
}

// 渠道能力
export interface ChannelCapabilities {}

// 入站消息封包
export interface InboundEnvelope {
  id: string;
  channel: string;
  conversationId: string;
  from: {
    id: string;
    name?: string;
  };
  text: string;
  timestamp: number;
  isGroup: boolean;
  raw: any;
}

// 出站消息封包
export interface OutboundEnvelope {
  conversationId: string;
  content: string;
  format?: 'text' | 'markdown';
}

// 渠道插件
export interface ChannelPlugin {
  meta: ChannelMeta;
  capabilities: ChannelCapabilities;

  start(): Promise<void>;
  stop(): Promise<void>;
  send(envelope: OutboundEnvelope): Promise<void>;

  onMessage?: (handler: (envelope: InboundEnvelope) => Promise<void>) => void;
}
