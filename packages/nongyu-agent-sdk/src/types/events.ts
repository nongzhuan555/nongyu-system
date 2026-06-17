import type { AgentInput, AgentOutput, AgentState } from './agent';
import type { Message } from './message';

// ===== 事件类型映射 =====

export type AgentEventMap = {
  // Agent 生命周期事件
  'agent:start': { agentName: string; input: AgentInput };
  'step:start': { agentName: string; stepNumber: number; messages: Message[] };
  'step:complete': {
    agentName: string;
    stepNumber: number;
    type: 'text' | 'tool_call';
    tokensUsed: number;
  };
  'text:delta': { agentName: string; delta: string; fullText: string };
  'text:complete': { agentName: string; text: string };

  // 工具事件
  'tool:call': { agentName: string; toolName: string; input: unknown };
  'tool:result': { agentName: string; toolName: string; output: unknown; duration: number };
  'tool:error': { agentName: string; toolName: string; error: Error };
  'tool:approval-required': { agentName: string; toolName: string; input: unknown };

  // 上下文事件
  'context:compact': { agentName: string; beforeTokens: number; afterTokens: number };

  // 终止事件
  'agent:complete': {
    agentName: string;
    output: AgentOutput;
    totalSteps: number;
    totalTokens: number;
  };
  'agent:stop': { agentName: string; stepNumber: number };
  'agent:error': { agentName: string; error: Error; stepNumber: number };

  // 状态变更
  'state:change': { agentName: string; state: AgentState };
};

export type AgentEvent = keyof AgentEventMap;

export type AgentEventHandler<E extends AgentEvent> = (payload: AgentEventMap[E]) => void;
