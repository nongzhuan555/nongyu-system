// ===== 核心 =====
export { createAgent, AgentImpl } from "./core/agent";

export { buildSystemPrompt } from "./core/prompt";

export { tool, ToolRegistry, zodToJsonSchema } from "./core/tool";

// ===== 业务工具集 =====
export { jiaowuTools } from "./core/tool/ExternalTools/jiaowu-tools";
export { secondTools } from "./core/tool/ExternalTools/second-tools";

export { EventBus } from "./core/events";

export { AgentLoop } from "./core/agent/loop";

export { stopConditions } from "./core/agent/loop/stop-conditions";

export { agentAsTool } from "./core/agent/sub-agent";

// ===== 配置 =====
export {
  configure,
  resolveApiConfig,
  isConfigured,
  resetConfig,
  createOpenAI,
} from "./core/config";

// ===== 模型 =====
export { OpenAIProvider } from "./core/model";

// ===== 上下文 =====
export {
  createContextManager,
  ContextManagerImpl,
  TrimmingStrategy,
  TokenStatsTracker,
  chatMessagesToModelMessages,
  prepareConversationWindow,
} from "./core/context";

// ===== 通道 =====
// StdioChannel 依赖 Node readline，走子路径 `nongyu-agent-sdk/stdio`，勿并入主入口
export { Gateway } from "./core/channel/gateway";

// ===== 工具函数 =====
export { generateId, delay, safeJsonParse, isAbortError } from "./shared/utils";

export { createAbortSignal, combineAbortSignals } from "./shared/abort";

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
  StreamToolCallDelta,
  ToolSchema,

  // Context
  AgentContext,
  ContextConfig,
  ContextManager,
  ContextCompactPayload,
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
} from "./types";

// ===== React Hooks（使用方需自行安装 react >=18）=====
export { useAgentChat } from "./hooks";
export type { ChatMessage, UseAgentChatConfig, UseAgentChatReturn } from "./hooks";

export type { SDKConfig } from "./core/config";
