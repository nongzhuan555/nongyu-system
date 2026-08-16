import { useState, useRef, useCallback, useEffect } from "react";
import { chatMessagesToModelMessages } from "../core/context/chatToModel";
import type { ToolCallRecord } from "../types/agent";
import type { ChatMessage, UseAgentChatConfig, UseAgentChatReturn } from "./types";

/**
 * 生成唯一 ID
 */
function uid(prefix = "msg"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 工具调用匹配：优先按 callId 精确匹配；callId 缺失时按 toolName + 未填充 output 降级匹配。
 * 解决一条 assistant 消息内并发同名工具调用错位问题。
 */
function matchCall(
  tc: ToolCallRecord,
  callId: string | undefined,
  toolName: string | undefined,
): boolean {
  if (callId != null && tc.callId != null) return tc.callId === callId;
  // 降级：按 toolName 且 output 尚未填充
  return tc.toolName === toolName && tc.output === undefined;
}

/**
 * 流式块内部类型（AgentStreamChunk 的子集）
 */
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
  content?: string;
  totalSteps?: number;
  totalTokens?: number;
  error?: Error;
  renderComponent?: string;
  ok?: boolean;
  beforeTokens?: number;
  afterTokens?: number;
  llmSummary?: string;
  llmCompactedUntilId?: string;
}

/**
 * useAgentChat —— 统一的 React 人机对话 Hook
 *
 * 直接消费 Agent.stream()，不依赖 Channel / Gateway 中间层。
 * 同时支持 React DOM 和 React Native。
 *
 * @example
 * ```tsx
 * const { messages, input, handleInputChange, handleSubmit, isLoading } =
 *   useAgentChat({ agent });
 *
 * return (
 *   <div>
 *     {messages.map(m => <p key={m.id}>{m.role}: {m.content}</p>)}
 *     <form onSubmit={handleSubmit}>
 *       <input value={input} onChange={handleInputChange} />
 *       <button disabled={isLoading}>发送</button>
 *     </form>
 *   </div>
 * );
 * ```
 */
export function useAgentChat(config: UseAgentChatConfig): UseAgentChatReturn {
  const {
    agent,
    initialMessages = [],
    onError,
    onToolCall,
    debug,
    textUpdateThrottleMs = 0,
    llmSummary,
    llmCompactedUntilId,
    onContextCompact,
  } = config;

  const log = useCallback(
    (...args: unknown[]) => {
      if (debug) console.log("[AgentChat Debug]", ...args);
    },
    [debug],
  );

  const logWarn = useCallback(
    (...args: unknown[]) => {
      if (debug) console.warn("[AgentChat Debug]", ...args);
    },
    [debug],
  );

  // ---- 状态 ----
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // ---- Ref：跨渲染保持的引用 ----
  const lastPromptRef = useRef<string>("");
  /** 当前正在流式更新的 assistant 消息 ID */
  const streamingMsgIdRef = useRef<string | null>(null);
  /** 是否正在生成中（用来在 effect 清理时判断是否需要 stop） */
  const runningRef = useRef(false);

  // ---- 文本节流（流式渲染流畅性）----
  /** 待 flush 的最新全文（节流期间累积） */
  const pendingTextRef = useRef<string>("");
  /** 节流定时器句柄 */
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 立即清除定时器 */
  const clearFlushTimer = useCallback(() => {
    if (flushTimerRef.current != null) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, []);

  /** 把 pendingTextRef 的最新文本 flush 到对应消息 */
  const flushText = useCallback((msgId: string) => {
    const text = pendingTextRef.current;
    setMessages((prev: ChatMessage[]) =>
      prev.map((m: ChatMessage) =>
        m.id === msgId ? { ...m, content: text, status: "streaming" as const } : m,
      ),
    );
  }, []);

  /** 安排一次节流 flush（throttleMs=0 时立即 flush） */
  const scheduleFlush = useCallback(
    (msgId: string) => {
      if (textUpdateThrottleMs <= 0) {
        flushText(msgId);
        return;
      }
      if (flushTimerRef.current != null) return;
      flushTimerRef.current = setTimeout(() => {
        flushTimerRef.current = null;
        flushText(msgId);
      }, textUpdateThrottleMs);
    },
    [textUpdateThrottleMs, flushText],
  );

  // ---- 核心：消费 agent.stream() ----
  const runStream = useCallback(
    async (prompt: string) => {
      if (runningRef.current) return;
      runningRef.current = true;
      setIsLoading(true);
      setError(null);
      lastPromptRef.current = prompt;
      pendingTextRef.current = "";

      // 添加用户消息
      const userMsg: ChatMessage = {
        id: uid("user"),
        role: "user",
        content: prompt,
        createdAt: Date.now(),
        status: "done",
      };

      // 添加占位 assistant 消息（pending 状态）
      const aiMsgId = uid("ai");
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        role: "assistant",
        content: "",
        createdAt: Date.now(),
        status: "pending",
      };

      streamingMsgIdRef.current = aiMsgId;
      let historySnapshot: ChatMessage[] = [];
      setMessages((prev: ChatMessage[]) => {
        const last = prev[prev.length - 1];
        historySnapshot =
          last?.role === "user" && last.content === prompt ? prev.slice(0, -1) : prev;
        return [...prev, userMsg, aiMsg];
      });

      try {
        const streamIterable = agent.stream({
          prompt,
          history: chatMessagesToModelMessages(historySnapshot),
          llmSummary,
          llmCompactedUntilId,
        }) as AsyncIterable<StreamChunk>;
        log("🚀 开始模型调用, prompt:", prompt.slice(0, 100) + (prompt.length > 100 ? "..." : ""));

        for await (const chunk of streamIterable) {
          if (!runningRef.current) break;

          switch (chunk.type) {
            case "text:delta": {
              // 节流：累积到 ref，按 throttleMs flush
              pendingTextRef.current =
                chunk.fullText ?? pendingTextRef.current + (chunk.delta ?? "");
              scheduleFlush(aiMsgId);
              break;
            }

            case "tool:call": {
              log("🔧 工具调用:", chunk.toolName, chunk.input);
              if (onToolCall) {
                onToolCall({ toolName: chunk.toolName!, input: chunk.input });
              }
              setMessages((prev: ChatMessage[]) =>
                prev.map((m: ChatMessage) => {
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
                }),
              );
              break;
            }

            case "tool:result": {
              setMessages((prev: ChatMessage[]) =>
                prev.map((m: ChatMessage) => {
                  if (m.id !== aiMsgId) return m;
                  const toolCalls = (m.toolCalls ?? []).map((tc: ToolCallRecord) =>
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
                }),
              );
              break;
            }

            case "tool:error": {
              setMessages((prev: ChatMessage[]) =>
                prev.map((m: ChatMessage) => {
                  if (m.id !== aiMsgId) return m;
                  const toolCalls = (m.toolCalls ?? []).map((tc: ToolCallRecord) =>
                    matchCall(tc, chunk.callId, chunk.toolName)
                      ? {
                          ...tc,
                          status: "error" as const,
                          error: chunk.error?.message ?? "工具执行失败",
                        }
                      : tc,
                  );
                  return { ...m, toolCalls, status: "streaming" as const };
                }),
              );
              break;
            }

            case "agent:complete": {
              // 强制 flush 剩余文本，避免节流导致末尾丢失
              clearFlushTimer();
              if (pendingTextRef.current) flushText(aiMsgId);
              setMessages((prev: ChatMessage[]) =>
                prev.map((m: ChatMessage) =>
                  m.id === aiMsgId ? { ...m, status: "done" as const } : m,
                ),
              );
              break;
            }

            case "agent:error": {
              clearFlushTimer();
              const err = chunk.error ?? new Error("Agent 未知错误");
              setMessages((prev: ChatMessage[]) =>
                prev.map((m: ChatMessage) =>
                  m.id === aiMsgId ? { ...m, status: "error" as const, error: err.message } : m,
                ),
              );
              setError(err);
              onError?.(err);
              break;
            }

            case "context:compact": {
              onContextCompact?.({
                ok: Boolean(chunk.ok),
                beforeTokens: chunk.beforeTokens ?? 0,
                afterTokens: chunk.afterTokens ?? 0,
                llmSummary: chunk.llmSummary,
                llmCompactedUntilId: chunk.llmCompactedUntilId,
              });
              break;
            }

            // step:start / step:complete / 其他 —— 静默跳过
            default: {
              if (chunk.type === "step:start" && chunk.stepNumber != null) {
                log(`📋 第${chunk.stepNumber}步开始`);
              }
              break;
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // 用户主动停止，标记为 stopped（保留已有内容）
          setMessages((prev: ChatMessage[]) =>
            prev.map((m: ChatMessage) =>
              m.id === aiMsgId && (m.status === "streaming" || m.status === "pending")
                ? { ...m, status: "stopped" as const }
                : m,
            ),
          );
        } else {
          const e = err instanceof Error ? err : new Error(String(err));
          setMessages((prev: ChatMessage[]) =>
            prev.map((m: ChatMessage) =>
              m.id === aiMsgId ? { ...m, status: "error" as const, error: e.message } : m,
            ),
          );
          setError(e);
          onError?.(e);
        }
      } finally {
        runningRef.current = false;
        setIsLoading(false);
        streamingMsgIdRef.current = null;
        clearFlushTimer();
      }
    },
    [
      agent,
      onError,
      onToolCall,
      log,
      logWarn,
      textUpdateThrottleMs,
      scheduleFlush,
      clearFlushTimer,
      flushText,
      llmSummary,
      llmCompactedUntilId,
      onContextCompact,
    ],
  );

  // ---- 输入变更（同时支持 DOM Event 和 RN string）----
  const handleInputChange: UseAgentChatReturn["handleInputChange"] = useCallback(
    (e: { target: { value: string } } | string) => {
      setInput(typeof e === "string" ? e : e.target.value);
    },
    [],
  );

  // ---- 提交 ----
  const handleSubmit = useCallback(
    async (e?: { preventDefault?: () => void }) => {
      e?.preventDefault?.();
      const text = input.trim();
      if (!text || isLoading) return;
      setInput("");
      await runStream(text);
    },
    [input, isLoading, runStream],
  );

  // ---- 追加 ----
  const append = useCallback(
    async (message: { role: "user"; content: string }) => {
      if (isLoading) return;
      await runStream(message.content);
    },
    [isLoading, runStream],
  );

  // ---- 重新生成 ----
  const reload = useCallback(async () => {
    if (isLoading || !lastPromptRef.current) return;

    // 移除最后一条 assistant 消息，回到最后一条 user 消息
    setMessages((prev: ChatMessage[]) => {
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].role === "assistant") {
          return prev.slice(0, i);
        }
      }
      return prev;
    });

    await runStream(lastPromptRef.current);
  }, [isLoading, runStream]);

  // ---- 停止 ----
  const stop = useCallback(() => {
    runningRef.current = false;
    // 调用 Agent 的 stop 方法（类型宽松，运行时判断）
    if (typeof (agent as Record<string, unknown>).stop === "function") {
      agent.stop();
    }
  }, [agent]);

  // ---- 清空 ----
  const clear = useCallback(() => {
    if (isLoading) {
      stop();
    }
    setMessages([]);
    setError(null);
    lastPromptRef.current = "";
  }, [isLoading, stop]);

  // ---- 组件卸载时清理 ----
  useEffect(() => {
    return () => {
      runningRef.current = false;
      clearFlushTimer();
    };
  }, [clearFlushTimer]);

  return {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    append,
    reload,
    stop,
    isLoading,
    error,
    clear,
  };
}
