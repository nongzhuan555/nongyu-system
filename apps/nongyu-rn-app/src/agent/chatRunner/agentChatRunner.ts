import {
  chatMessagesToModelMessages,
  type Agent,
  type ChatMessage,
  type ToolCallRecord,
} from "nongyu-agent-sdk";

/** 流式块（与 useAgentChat 对齐的子集） */
interface StreamChunk {
  type: string;
  delta?: string;
  fullText?: string;
  toolName?: string;
  callId?: string;
  input?: unknown;
  output?: unknown;
  duration?: number;
  stepNumber?: number;
  error?: Error;
  renderComponent?: string;
  ok?: boolean;
  beforeTokens?: number;
  afterTokens?: number;
  llmSummary?: string;
  llmCompactedUntilId?: string;
}

function uid(prefix = "msg"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function matchCall(
  tc: ToolCallRecord,
  callId: string | undefined,
  toolName: string | undefined,
): boolean {
  if (callId != null && tc.callId != null) return tc.callId === callId;
  return tc.toolName === toolName && tc.output === undefined;
}

export type AgentChatEndReason = "complete" | "stop" | "error" | "background-interrupt";

export type AgentChatRunnerSnapshot = {
  /** 当前 run 绑定的会话 id（草稿首条落盘后会从 draftKey 升格） */
  sessionId: string | null;
  /** 面板 key：sessionId 或 draft-* */
  runKey: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  error: Error | null;
  lastEndReason: AgentChatEndReason | null;
  llmSummary?: string;
  llmCompactedUntilId?: string;
};

export type AgentChatPersistPayload = {
  runKey: string;
  sessionId: string | null;
  messages: ChatMessage[];
  reason: "first-user" | "complete" | "stop" | "error";
};

export type AgentChatCompactPayload = {
  ok: boolean;
  beforeTokens: number;
  afterTokens: number;
  llmSummary?: string;
  llmCompactedUntilId?: string;
};

type Listener = () => void;

/**
 * 模块级对话 Runner：生命周期不绑定 AI 页挂载，支持离页/后台继续生成。
 * 同一时刻仅一路流（与 Agent 单例 abortController 一致）。
 */
class AgentChatRunner {
  private listeners = new Set<Listener>();
  private agent: Agent | null = null;
  private running = false;
  private backgroundedDuringRun = false;
  private userStopped = false;

  private sessionId: string | null = null;
  private runKey: string | null = null;
  private messages: ChatMessage[] = [];
  private isLoading = false;
  private error: Error | null = null;
  private lastEndReason: AgentChatEndReason | null = null;
  private llmSummary: string | undefined;
  private llmCompactedUntilId: string | undefined;

  /** useSyncExternalStore 要求 getSnapshot 在无变更时返回同一引用 */
  private snapshot: AgentChatRunnerSnapshot = {
    sessionId: null,
    runKey: null,
    messages: [],
    isLoading: false,
    error: null,
    lastEndReason: null,
  };

  private streamingMsgId: string | null = null;
  private pendingText = "";
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private textThrottleMs = 40;

  private persistHandler: ((p: AgentChatPersistPayload) => void) | null = null;
  private compactHandler: ((p: AgentChatCompactPayload) => void) | null = null;
  private errorHandler: ((error: Error, reason: AgentChatEndReason) => void) | null = null;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): AgentChatRunnerSnapshot {
    return this.snapshot;
  }

  /** 是否有进行中的生成 */
  isBusy(): boolean {
    return this.isLoading || this.running;
  }

  /** 当前 run 是否对应该面板（draft runKey 或 sessionId） */
  matchesView(viewKey: string, viewSessionId: string | null): boolean {
    if (!this.runKey && !this.sessionId) return false;
    if (this.runKey === viewKey) return true;
    if (this.sessionId != null) {
      if (this.sessionId === viewKey) return true;
      if (viewSessionId != null && this.sessionId === viewSessionId) return true;
    }
    return false;
  }

  setPersistHandler(handler: ((p: AgentChatPersistPayload) => void) | null): void {
    this.persistHandler = handler;
  }

  setCompactHandler(handler: ((p: AgentChatCompactPayload) => void) | null): void {
    this.compactHandler = handler;
  }

  setErrorHandler(handler: ((error: Error, reason: AgentChatEndReason) => void) | null): void {
    this.errorHandler = handler;
  }

  /** 首条落盘后写入真实 sessionId（保留 draft runKey，避免当前面板 isLive 丢失） */
  bindSessionId(sessionId: string): void {
    if (!this.runKey) return;
    this.sessionId = sessionId;
    this.emit();
  }

  markAppBackgrounded(): void {
    if (this.isBusy()) {
      this.backgroundedDuringRun = true;
    }
  }

  /** 回前台：若已因后台中断结束，消费并返回是否应 Toast */
  consumeBackgroundInterruptToast(): boolean {
    if (this.lastEndReason === "background-interrupt") {
      this.lastEndReason = null;
      return true;
    }
    return false;
  }

  /**
   * 开始或拒绝发送。busy 且非本会话 → 返回 busy。
   */
  async send(params: {
    agent: Agent;
    viewKey: string;
    sessionId: string | null;
    prompt: string;
    historyMessages: ChatMessage[];
    llmSummary?: string;
    llmCompactedUntilId?: string;
  }): Promise<"ok" | "busy" | "empty"> {
    const prompt = params.prompt.trim();
    if (!prompt) return "empty";

    if (this.isBusy()) {
      if (!this.matchesView(params.viewKey, params.sessionId)) {
        return "busy";
      }
      return "busy";
    }

    this.agent = params.agent;
    this.sessionId = params.sessionId;
    this.runKey = params.sessionId ?? params.viewKey;
    this.llmSummary = params.llmSummary;
    this.llmCompactedUntilId = params.llmCompactedUntilId;
    this.error = null;
    this.lastEndReason = null;
    this.userStopped = false;
    this.backgroundedDuringRun = false;

    await this.runStream(prompt, params.historyMessages);
    return "ok";
  }

  stop(): void {
    if (!this.isBusy()) return;
    this.userStopped = true;
    this.running = false;
    this.backgroundedDuringRun = false;
    if (this.agent && typeof this.agent.stop === "function") {
      try {
        this.agent.stop();
      } catch {
        // ignore
      }
    }
    this.finishAssistantAsDone();
    this.isLoading = false;
    this.lastEndReason = "stop";
    this.emitPersist("stop");
    this.emit();
  }

  /** 删除某会话时：若正是当前 run 则 stop */
  stopIfSession(sessionId: string): void {
    if (this.sessionId === sessionId || this.runKey === sessionId) {
      this.stop();
      this.clearLiveState();
    }
  }

  /** 登出 / invalidate：停并清空 */
  reset(): void {
    this.stop();
    this.clearLiveState();
  }

  private clearLiveState(): void {
    this.sessionId = null;
    this.runKey = null;
    this.messages = [];
    this.isLoading = false;
    this.running = false;
    this.error = null;
    this.lastEndReason = null;
    this.llmSummary = undefined;
    this.llmCompactedUntilId = undefined;
    this.streamingMsgId = null;
    this.clearFlushTimer();
    this.emit();
  }

  private emit(): void {
    this.snapshot = {
      sessionId: this.sessionId,
      runKey: this.runKey,
      messages: this.messages,
      isLoading: this.isLoading,
      error: this.error,
      lastEndReason: this.lastEndReason,
      llmSummary: this.llmSummary,
      llmCompactedUntilId: this.llmCompactedUntilId,
    };
    for (const listener of this.listeners) {
      listener();
    }
  }

  private emitPersist(reason: AgentChatPersistPayload["reason"]): void {
    if (!this.runKey || !this.persistHandler) return;
    this.persistHandler({
      runKey: this.runKey,
      sessionId: this.sessionId,
      messages: this.messages,
      reason,
    });
  }

  private clearFlushTimer(): void {
    if (this.flushTimer != null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private flushText(msgId: string): void {
    const text = this.pendingText;
    this.messages = this.messages.map((m) =>
      m.id === msgId ? { ...m, content: text, status: "streaming" as const } : m,
    );
    this.emit();
  }

  private scheduleFlush(msgId: string): void {
    if (this.textThrottleMs <= 0) {
      this.flushText(msgId);
      return;
    }
    if (this.flushTimer != null) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flushText(msgId);
    }, this.textThrottleMs);
  }

  private finishAssistantAsDone(): void {
    const aiMsgId = this.streamingMsgId;
    if (!aiMsgId) return;
    this.clearFlushTimer();
    if (this.pendingText) this.flushText(aiMsgId);
    this.messages = this.messages.map((m) =>
      m.id === aiMsgId && (m.status === "streaming" || m.status === "pending")
        ? { ...m, status: "done" as const }
        : m,
    );
    this.streamingMsgId = null;
  }

  private async runStream(prompt: string, historyMessages: ChatMessage[]): Promise<void> {
    if (!this.agent) return;

    this.running = true;
    this.isLoading = true;
    this.emit();

    const userMsg: ChatMessage = {
      id: uid("user"),
      role: "user",
      content: prompt,
      createdAt: Date.now(),
      status: "done",
    };
    const aiMsgId = uid("ai");
    const aiMsg: ChatMessage = {
      id: aiMsgId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      status: "pending",
    };

    this.streamingMsgId = aiMsgId;
    this.pendingText = "";
    this.messages = [...historyMessages, userMsg, aiMsg];
    this.emit();
    this.emitPersist("first-user");

    try {
      const streamIterable = this.agent.stream({
        prompt,
        history: chatMessagesToModelMessages(historyMessages),
        llmSummary: this.llmSummary,
        llmCompactedUntilId: this.llmCompactedUntilId,
      }) as AsyncIterable<StreamChunk>;

      for await (const chunk of streamIterable) {
        if (!this.running) break;

        switch (chunk.type) {
          case "text:delta": {
            this.pendingText = chunk.fullText ?? this.pendingText + (chunk.delta ?? "");
            this.scheduleFlush(aiMsgId);
            break;
          }
          case "tool:call": {
            this.messages = this.messages.map((m) => {
              if (m.id !== aiMsgId) return m;
              const existing = m.toolCalls ?? [];
              return {
                ...m,
                toolCalls: [
                  ...existing,
                  {
                    callId: chunk.callId,
                    toolName: chunk.toolName!,
                    input: chunk.input,
                    status: "executing" as const,
                    renderComponent: chunk.renderComponent,
                  } as ToolCallRecord,
                ],
                status: "streaming" as const,
              };
            });
            this.emit();
            break;
          }
          case "tool:result": {
            this.messages = this.messages.map((m) => {
              if (m.id !== aiMsgId) return m;
              const toolCalls = (m.toolCalls ?? []).map((tc) =>
                matchCall(tc, chunk.callId, chunk.toolName)
                  ? {
                      ...tc,
                      output: chunk.output,
                      duration: chunk.duration,
                      status: "done" as const,
                    }
                  : tc,
              );
              return { ...m, toolCalls, status: "streaming" as const };
            });
            this.emit();
            break;
          }
          case "tool:error": {
            this.messages = this.messages.map((m) => {
              if (m.id !== aiMsgId) return m;
              const toolCalls = (m.toolCalls ?? []).map((tc) =>
                matchCall(tc, chunk.callId, chunk.toolName)
                  ? {
                      ...tc,
                      status: "error" as const,
                      error: chunk.error?.message ?? "工具执行失败",
                    }
                  : tc,
              );
              return { ...m, toolCalls, status: "streaming" as const };
            });
            this.emit();
            break;
          }
          case "agent:complete": {
            this.clearFlushTimer();
            if (this.pendingText) this.flushText(aiMsgId);
            this.messages = this.messages.map((m) =>
              m.id === aiMsgId ? { ...m, status: "done" as const } : m,
            );
            this.emit();
            break;
          }
          case "agent:error": {
            this.clearFlushTimer();
            const err = chunk.error ?? new Error("Agent 未知错误");
            this.messages = this.messages.map((m) =>
              m.id === aiMsgId ? { ...m, status: "error" as const, error: err.message } : m,
            );
            this.error = err;
            this.emit();
            this.handleStreamError(err);
            break;
          }
          case "context:compact": {
            const payload: AgentChatCompactPayload = {
              ok: Boolean(chunk.ok),
              beforeTokens: chunk.beforeTokens ?? 0,
              afterTokens: chunk.afterTokens ?? 0,
              llmSummary: chunk.llmSummary,
              llmCompactedUntilId: chunk.llmCompactedUntilId,
            };
            if (payload.ok) {
              this.llmSummary = payload.llmSummary;
            } else {
              this.llmSummary = undefined;
            }
            this.llmCompactedUntilId = payload.llmCompactedUntilId;
            this.compactHandler?.(payload);
            this.emit();
            break;
          }
          default:
            break;
        }
      }

      if (!this.userStopped && !this.error) {
        this.lastEndReason = "complete";
        this.emitPersist("complete");
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        this.finishAssistantAsDone();
        this.lastEndReason = "stop";
        this.emitPersist("stop");
      } else {
        const e = err instanceof Error ? err : new Error(String(err));
        this.messages = this.messages.map((m) =>
          m.id === aiMsgId ? { ...m, status: "error" as const, error: e.message } : m,
        );
        this.error = e;
        this.handleStreamError(e);
        this.emit();
      }
    } finally {
      this.running = false;
      this.isLoading = false;
      this.streamingMsgId = null;
      this.clearFlushTimer();
      this.emit();
    }
  }

  private handleStreamError(err: Error): void {
    const reason: AgentChatEndReason = this.backgroundedDuringRun
      ? "background-interrupt"
      : "error";
    this.lastEndReason = reason;
    this.backgroundedDuringRun = false;
    this.emitPersist("error");
    // 后台中断由 keepAlive 在回前台时统一 Toast，避免用户看不到
    if (reason !== "background-interrupt") {
      this.errorHandler?.(err, reason);
    }
  }
}

/** 全局单例 */
export const agentChatRunner = new AgentChatRunner();
