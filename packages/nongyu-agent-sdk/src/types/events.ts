import type { AgentInput, AgentOutput, AgentState } from "./agent";
import type { Message } from "./message";

// ===== 事件类型映射 =====

export type AgentEventMap = {
  // Agent 生命周期事件
  "agent:start": { agentName: string; input: AgentInput };
  "step:start": { agentName: string; stepNumber: number; messages: Message[] };
  "step:complete": {
    agentName: string;
    stepNumber: number;
    type: "text" | "tool_call";
    tokensUsed: number;
  };
  "text:delta": { agentName: string; delta: string; fullText: string };
  "text:complete": { agentName: string; text: string };

  // 工具事件
  "tool:call": {
    agentName: string;
    toolName: string;
    input: unknown;
    /** 工具调用唯一 id，来自模型 ToolCall.id；缺失时前端按 toolName 降级匹配 */
    callId?: string;
    /** 前端内联渲染组件名（来自 ToolDefinition.render.component） */
    renderComponent?: string;
    /** 是否渲染 A2UI；缺省按 true */
    showUI?: boolean;
  };
  "tool:result": {
    agentName: string;
    toolName: string;
    output: unknown;
    duration: number;
    callId?: string;
  };
  "tool:error": { agentName: string; toolName: string; error: Error; callId?: string };
  "tool:approval-required": { agentName: string; toolName: string; input: unknown };

  // 上下文事件
  "context:compact": {
    agentName: string;
    ok: boolean;
    beforeTokens: number;
    afterTokens: number;
    llmSummary?: string;
    llmCompactedUntilId?: string;
  };

  // 终止事件
  "agent:complete": {
    agentName: string;
    output: AgentOutput;
    totalSteps: number;
    totalTokens: number;
  };
  "agent:stop": { agentName: string; stepNumber: number };
  "agent:error": { agentName: string; error: Error; stepNumber: number };

  // 状态变更
  "state:change": { agentName: string; state: AgentState };
};

export type AgentEvent = keyof AgentEventMap;

export type AgentEventHandler<E extends AgentEvent> = (payload: AgentEventMap[E]) => void;
