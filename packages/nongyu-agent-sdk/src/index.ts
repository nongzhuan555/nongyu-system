// ===== 核心 =====
export {
  createAgent,
  AgentImpl,
} from './core/agent';

export { buildSystemPrompt } from './core/prompt';

export {
  tool,
  ToolRegistry,
  zodToJsonSchema,
} from './core/tool';

export {
  EventBus,
} from './core/events';

export {
  AgentLoop,
} from './core/agent/loop';

export {
  stopConditions,
} from './core/agent/loop/stop-conditions';

export {
  agentAsTool,
} from './core/agent/sub-agent';

// ===== 配置 =====
export {
  configure,
  resolveApiConfig,
  isConfigured,
  resetConfig,
  createOpenAI,
} from './core/config';

// ===== 模型 =====
export {
  OpenAIProvider,
} from './core/model';

// ===== 上下文 =====
export {
  createContextManager,
  ContextManagerImpl,
  TrimmingStrategy,
  TokenStatsTracker,
} from './core/context';

// ===== 通道 =====
export { Gateway } from './core/channel/gateway';
export { StdioChannel } from './core/channel/builtin/stdio';
export type { StdioChannelOptions } from './core/channel/builtin/stdio';

// ===== 工具函数 =====
export {
  generateId,
  delay,
  safeJsonParse,
  isAbortError,
} from './shared/utils';

export {
  createAbortSignal,
  combineAbortSignals,
} from './shared/abort';

// ===== 类型 =====
export type {
  // Agent
  Agent,
  AgentConfig,
  AgentState,
  AgentStatus,
  AgentInput,
  AgentOutput,
  RunConfig,
  StepContext,
  ToolApprovalConfig,
  ToolCallRecord,

  // Tool
  Tool,
  ToolContext,
  ToolDefinition,
  ToolCallResult,

  // Model
  ModelProvider,
  OpenAIConfig,
  ModelMessage,
  ToolCall,
  ModelUsage,
  GenerateConfig,
  GenerateResult,
  StreamDelta,
  ToolSchema,

  // Context
  AgentContext,
  ContextConfig,
  ContextManager,
  TokenStats,

  // Events
  AgentEventMap,
  AgentEvent,
  AgentEventHandler,

  // Message
  Message,
  MessageRole,

  // Stream
  AgentStreamChunk,

  // Channel
  ChannelPlugin,
  InboundEnvelope,
  OutboundEnvelope,
} from './types';

export type {
  SDKConfig,
} from './core/config';
