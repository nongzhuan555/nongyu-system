// ===== 流式块类型 =====

export type AgentStreamChunk =
  | { type: 'text:delta'; delta: string; fullText: string }
  | { type: 'tool:call'; toolName: string; input: unknown }
  | { type: 'tool:result'; toolName: string; output: unknown; duration: number }
  | { type: 'step:start'; stepNumber: number }
  | { type: 'step:complete'; stepNumber: number; tokensUsed: number }
  | { type: 'agent:complete'; content: string; totalSteps: number; totalTokens: number }
  | { type: 'agent:error'; error: Error };
