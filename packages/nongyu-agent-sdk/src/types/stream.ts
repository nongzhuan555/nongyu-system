// ===== 流式块类型 =====

export type AgentStreamChunk =
  | { type: "text:delta"; delta: string; fullText: string }
  | {
      type: "tool:call";
      callId?: string;
      toolName: string;
      input: unknown;
      renderComponent?: string;
    }
  | { type: "tool:result"; callId?: string; toolName: string; output: unknown; duration: number }
  | { type: "tool:error"; callId?: string; toolName: string; error: Error }
  | { type: "step:start"; stepNumber: number }
  | { type: "step:complete"; stepNumber: number; tokensUsed: number }
  | { type: "agent:complete"; content: string; totalSteps: number; totalTokens: number }
  | { type: "agent:error"; error: Error }
  | {
      type: "context:compact";
      ok: boolean;
      beforeTokens: number;
      afterTokens: number;
      llmSummary?: string;
      llmCompactedUntilId?: string;
    };
