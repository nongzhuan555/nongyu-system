import type { Tool } from './tool';
import type { AgentContext, ContextConfig as ContextManagerConfig } from './context';
import type { ModelProvider } from './model';
import type { AgentEventMap, AgentEventHandler } from './events';
import type { AgentStreamChunk } from './stream';
import type { Message } from './message';

// ===== Agent 配置 =====

export interface AgentConfig {
  /** 全局唯一标识，对应工具系统的 name */
  name: string;
  /** 功能描述，用于主 Agent 判断何时调用该子 Agent */
  description: string;
  /** 系统提示词，定义 Agent 角色与行为方式，创建后不可更改 */
  systemPrompt: string;
  /** 工具集 */
  tools?: Record<string, Tool>;
  /** 子 Agent 列表（将自动包装为 Tool） */
  subAgents?: Agent[];
  /** 使用的模型，默认继承主 Agent 或全局默认 */
  model?: ModelProvider;
  /** 上下文配置 */
  context?: ContextConfig;
  /** 运行控制 */
  runConfig?: RunConfig;
}

// 对 ContextManagerConfig 扩展，增加 summarizeBeforeTrim
export interface ContextConfig extends ContextManagerConfig {
  /** 是否在裁剪前先生成摘要 */
  summarizeBeforeTrim?: boolean;
}

// ===== Agent运行控制 =====
export interface RunConfig {
  /** 最大执行步数，防止无限循环，默认 20 */
  maxSteps?: number;
  /** 自定义停止条件 */
  stopWhen?: (context: StepContext) => boolean | Promise<boolean>;
  /** 每步执行前的钩子 */
  prepareStep?: (context: StepContext) => Promise<StepContext>;
  /** 工具调用是否需要用户审批 */
  toolApproval?: ToolApprovalConfig;
  /** 温度参数 */
  temperature?: number;
}

// ===== 工具调用审批 =====
export interface ToolApprovalConfig {
  /** 是否需要默认审批（无 onApprove 回调时生效） */
  defaultApproval?: boolean;
  /** 审批处理函数：返回 true 批准执行，false 拒绝执行 */
  onApprove?: (toolName: string, input: unknown) => Promise<boolean>;
}

// ===== Agent 执行上下文 =====
export interface StepContext {
  stepNumber: number;
  messages: Message[];
  toolCalls: ToolCallRecord[];
  totalTokens: number;
  finishReason?: string;
  model?: ModelProvider;
}

// ===== 工具调用记录 =====
export interface ToolCallRecord {
  toolName: string;
  input: unknown;
  output?: unknown;
  duration?: number;
}

// ===== Agent 状态 =====

export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'streaming'
  | 'tool-calling'
  | 'completed'
  | 'stopped'
  | 'error';

// ===== Agent 状态 =====
export interface AgentState {
  status: AgentStatus;
  currentStep: number;
  totalTokens: number;
  messages: Message[];
  error?: Error;
}

// ===== Agent 输入输出 =====

export interface AgentInput {
  prompt: string;
  context?: AgentContext;
}

export interface AgentOutput {
  content: string;
  steps: number;
  tokensUsed: number;
  messages: Message[];
  toolCalls: ToolCallRecord[];
}

// ===== Agent 接口 =====

export interface Agent {
  readonly name: string;
  readonly description: string;
  readonly state: Readonly<AgentState>;
  /** 完整回复 */
  complete(input: AgentInput): Promise<AgentOutput>;
  /** 流式回复 */
  stream(input: AgentInput): AsyncIterable<AgentStreamChunk>;
  /** 停止当前正在进行的回复 */
  stop(): void;
  /** 注册工具 */
  use(tool: Tool): this;
  /** 注册子 Agent */
  useSubAgent(agent: Agent): this;
  /** 事件订阅 */
  on<E extends keyof AgentEventMap>(event: E, handler: AgentEventHandler<E>): void;
  /** 事件取消订阅 */
  off<E extends keyof AgentEventMap>(event: E, handler: AgentEventHandler<E>): void;
}
