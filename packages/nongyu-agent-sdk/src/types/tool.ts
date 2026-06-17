import type { z } from 'zod';

// ===== 工具上下文 =====

export interface ToolContext {
  /** AbortSignal，用于工具执行时的取消控制 */
  abortSignal: AbortSignal;
  /** 发射工具内部事件（如进度） */
  emit: (event: string, data: unknown) => void;
  /** 当前 Agent 名称 */
  agentName: string;
  /** 会话 ID */
  sessionId?: string;
}

// ===== 工具定义 =====

export interface ToolDefinition<TInput extends z.ZodTypeAny = z.ZodTypeAny, TOutput = unknown> {
  /** 工具名称，全局唯一 */
  name: string;
  /** 工具描述，用于 LLM 理解何时调用 */
  description: string;
  /** 输入参数 Schema（Zod → JSON Schema 自动转换） */
  inputSchema: TInput;
  /** 执行函数 */
  execute: (input: z.infer<TInput>, context: ToolContext) => Promise<TOutput>;
  /** 是否需要用户审批 */
  needsApproval?: boolean | ((input: z.infer<TInput>) => boolean);
}

export interface Tool<TInput extends z.ZodTypeAny = z.ZodTypeAny, TOutput = unknown> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: TInput;
  /** 生成 JSON Schema 供 LLM 使用 */
  toJSONSchema(): Record<string, unknown>;
  /** 执行工具 */
  execute(input: z.infer<TInput>, context: ToolContext): Promise<TOutput>;
  /** 检查是否需要审批 */
  needsApproval(input: z.infer<TInput>): boolean;
}

// ===== 工具执行结果 =====

export interface ToolCallResult {
  toolName: string;
  input: unknown;
  output: unknown;
  duration: number;
  error?: Error;
}
