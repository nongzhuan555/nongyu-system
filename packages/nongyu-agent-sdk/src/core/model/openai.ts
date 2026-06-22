import type {
  ModelProvider,
  GenerateConfig,
  GenerateResult,
  StreamDelta,
  ModelMessage,
} from '../../types/model';
import { request } from '../../shared/network';

/**
 * OpenAI 兼容协议适配器
 *
 * 支持任何遵循 OpenAI Chat Completions API 的服务（OpenAI、DeepSeek、通义千问 等）。
 */
export interface OpenAIConfig {
  /** API 基础 URL */
  baseURL: string;
  /** API Key */
  apiKey: string;
  /** 模型名称 */
  model: string;
  /** 自定义请求头 */
  headers?: Record<string, string>;
}

export class OpenAIProvider implements ModelProvider {
  public readonly model: string;
  private baseURL: string;
  private apiKey: string;
  private headers: Record<string, string>;

  constructor(config: OpenAIConfig) {
    this.baseURL = config.baseURL.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.headers = config.headers ?? {};
  }

  async generateText(config: GenerateConfig): Promise<GenerateResult> {
    const body = this.buildRequestBody(config, false);

    const response = await request<{
      choices: Array<{
        message: {
          content: string | null;
          tool_calls?: Array<{
            id: string;
            type: 'function';
            function: { name: string; arguments: string };
          }>;
        };
        finish_reason: string;
      }>;
      usage: {
        prompt_tokens: number; // 输入令牌数
        completion_tokens: number; // 输出令牌数
        total_tokens: number; // 总令牌数
      };
    }>(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    const choice = response.choices[0];
    if (!choice) {
      throw new Error('模型未返回任何选择');
    }

    return {
      content: choice.message.content,
      toolCalls: choice.message.tool_calls ?? [],
      finishReason: choice.finish_reason,
      usage: response.usage,
    };
  }

  async *streamText(config: GenerateConfig): AsyncIterable<StreamDelta> {
    const body = this.buildRequestBody(config, true);

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        ...this.headers,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI API 错误 (${response.status}): ${text}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('响应 body 不可读');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json.choices?.[0]?.delta;
            const finishReason = json.choices?.[0]?.finish_reason;

            if (delta) {
              yield {
                content: delta.content ?? undefined,
                toolCalls: delta.tool_calls ?? undefined,
                finishReason,
              };
            }
          } catch {
            // 跳过无法解析的行
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private buildRequestBody(
    config: GenerateConfig,
    stream: boolean,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: config.messages.map(convertMessage),
      stream,
    };

    if (config.temperature != null) body.temperature = config.temperature;
    if (config.max_tokens != null) body.max_tokens = config.max_tokens;
    if (config.stop) body.stop = config.stop;
    if (config.tools && config.tools.length > 0) {
      body.tools = config.tools;
      body.tool_choice = 'auto';
    }

    return body;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      ...this.headers,
    };
  }
}

function convertMessage(msg: ModelMessage): Record<string, unknown> {
  const result: Record<string, unknown> = {
    role: msg.role,
    content: msg.content,
  };

  if (msg.role === 'tool') {
    // tool 角色消息必须有 name 字段（DeepSeek 等厂商强制要求）
    result.name = msg.name ?? '';
    if (msg.tool_call_id) result.tool_call_id = msg.tool_call_id;
  } else {
    if (msg.name) result.name = msg.name;
    if (msg.tool_call_id) result.tool_call_id = msg.tool_call_id;
  }
  if (msg.tool_calls && msg.tool_calls.length > 0) {
    result.tool_calls = msg.tool_calls;
  }

  return result;
}
