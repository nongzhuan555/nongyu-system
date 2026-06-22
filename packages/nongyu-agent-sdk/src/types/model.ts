// ===== 模型消息 =====

export interface ModelMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
  name?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// ===== 模型使用统计 =====

export interface ModelUsage {
  prompt_tokens: number;  // 输入令牌数
  completion_tokens: number; // 输出令牌数
  total_tokens: number; // 总令牌数
}

// ===== 模型生成配置 =====

export interface GenerateConfig {
  /** 模型名称 */
  model: string;
  /** 消息列表 */
  messages: ModelMessage[];
  /** 可用工具列表（JSON Schema 格式） */
  tools?: ToolSchema[];
  /** 温度 */
  temperature?: number;
  /** 最大输出 Token */
  max_tokens?: number;
  /** 停止词 */
  stop?: string[];
}

export interface ToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// ===== 模型响应 =====

export interface GenerateResult {
  content: string | null;
  toolCalls: ToolCall[];
  finishReason: string;
  usage: ModelUsage;
}

// ===== 流式增量 =====

/** 流式返回的 tool_call delta，包含 index 用于合并 */
export interface StreamToolCallDelta extends Partial<ToolCall> {
  index?: number;
}

export interface StreamDelta {
  /** 文本增量 */
  content?: string;
  /** 工具调用增量 */
  toolCalls?: StreamToolCallDelta[];
  /** 结束原因 */
  finishReason?: string;
}

// ===== 模型提供者接口 =====

export interface ModelProvider {
  /** 模型名称 */
  readonly model: string;

  /** 完整生成 */
  generateText(config: GenerateConfig): Promise<GenerateResult>;

  /** 流式生成，返回 AsyncIterable */
  streamText(config: GenerateConfig): AsyncIterable<StreamDelta>;
}
