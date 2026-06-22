import { useState, useRef, useCallback, useEffect } from 'react';
import type { ToolCallRecord } from '../types/agent';
import type {
  ChatMessage,
  UseAgentChatConfig,
  UseAgentChatReturn,
} from './types';

/**
 * 生成唯一 ID
 */
function uid(prefix = 'msg'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 流式块内部类型（AgentStreamChunk 的子集）
 */
interface StreamChunk {
  type: string;
  delta?: string;
  fullText?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  duration?: number;
  stepNumber?: number;
  content?: string;
  totalSteps?: number;
  totalTokens?: number;
  error?: Error;
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
  const { agent, initialMessages = [], onError, onToolCall, debug } = config;

  const log = useCallback(
    (...args: unknown[]) => {
      if (debug) console.log('[AgentChat Debug]', ...args);
    },
    [debug],
  );

  const logWarn = useCallback(
    (...args: unknown[]) => {
      if (debug) console.warn('[AgentChat Debug]', ...args);
    },
    [debug],
  );

  // ---- 状态 ----
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // ---- Ref：跨渲染保持的引用 ----
  const lastPromptRef = useRef<string>('');
  /** 当前正在流式更新的 assistant 消息 ID */
  const streamingMsgIdRef = useRef<string | null>(null);
  /** 是否正在生成中（用来在 effect 清理时判断是否需要 stop） */
  const runningRef = useRef(false);

  // ---- 核心：消费 agent.stream() ----
  const runStream = useCallback(
    async (prompt: string) => {
      if (runningRef.current) return;
      runningRef.current = true;
      setIsLoading(true);
      setError(null);
      lastPromptRef.current = prompt;

      // 添加用户消息
      const userMsg: ChatMessage = {
        id: uid('user'),
        role: 'user',
        content: prompt,
        createdAt: Date.now(),
        status: 'done',
      };

      // 添加占位 assistant 消息（pending 状态）
      const aiMsgId = uid('ai');
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        status: 'pending',
      };

      streamingMsgIdRef.current = aiMsgId;
      setMessages((prev: ChatMessage[]) => [...prev, userMsg, aiMsg]);

      try {
        const streamIterable = agent.stream({ prompt }) as AsyncIterable<StreamChunk>;
        log('🚀 开始模型调用, prompt:', prompt.slice(0, 100) + (prompt.length > 100 ? '...' : ''));

        for await (const chunk of streamIterable) {
          if (!runningRef.current) break;

          switch (chunk.type) {
            case 'text:delta': {
              setMessages((prev: ChatMessage[]) =>
                prev.map((m: ChatMessage) =>
                  m.id === aiMsgId
                    ? {
                        ...m,
                        content: chunk.fullText ?? (m.content + (chunk.delta ?? '')),
                        status: 'streaming' as const,
                      }
                    : m,
                ),
              );
              break;
            }

            case 'tool:call': {
              log('🔧 工具调用:', chunk.toolName, chunk.input);
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
                        toolName: chunk.toolName!,
                        input: chunk.input,
                      } as ToolCallRecord,
                    ],
                    status: 'streaming' as const,
                  };
                }),
              );
              break;
            }

            case 'tool:result': {
              setMessages((prev: ChatMessage[]) =>
                prev.map((m: ChatMessage) => {
                  if (m.id !== aiMsgId) return m;
                  const toolCalls = (m.toolCalls ?? []).map(
                    (tc: ToolCallRecord) =>
                      tc.toolName === chunk.toolName && tc.output === undefined
                        ? {
                            ...tc,
                            output: chunk.output,
                            duration: chunk.duration,
                          }
                        : tc,
                  );
                  return { ...m, toolCalls, status: 'streaming' as const };
                }),
              );
              break;
            }

            case 'agent:complete': {
              setMessages((prev: ChatMessage[]) =>
                prev.map((m: ChatMessage) =>
                  m.id === aiMsgId ? { ...m, status: 'done' as const } : m,
                ),
              );
              break;
            }

            case 'agent:error': {
              const err = chunk.error ?? new Error('Agent 未知错误');
              setMessages((prev: ChatMessage[]) =>
                prev.map((m: ChatMessage) =>
                  m.id === aiMsgId
                    ? { ...m, status: 'error' as const, error: err.message }
                    : m,
                ),
              );
              setError(err);
              onError?.(err);
              break;
            }

            // step:start / step:complete / 其他 —— 静默跳过
            default: {
              if (chunk.type === 'step:start' && chunk.stepNumber != null) {
                log(`📋 第${chunk.stepNumber}步开始`);
              }
              break;
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // 用户主动停止，标记当前消息为 done（保留已有内容）
          setMessages((prev: ChatMessage[]) =>
            prev.map((m: ChatMessage) =>
              m.id === aiMsgId && m.status === 'streaming'
                ? { ...m, status: 'done' as const }
                : m,
            ),
          );
        } else {
          const e = err instanceof Error ? err : new Error(String(err));
          setMessages((prev: ChatMessage[]) =>
            prev.map((m: ChatMessage) =>
              m.id === aiMsgId
                ? { ...m, status: 'error' as const, error: e.message }
                : m,
            ),
          );
          setError(e);
          onError?.(e);
        }
      } finally {
        runningRef.current = false;
        setIsLoading(false);
        streamingMsgIdRef.current = null;
      }
    },
    [agent, onError, onToolCall, log, logWarn],
  );

  // ---- 输入变更（同时支持 DOM Event 和 RN string）----
  const handleInputChange: UseAgentChatReturn['handleInputChange'] = useCallback(
    (e: { target: { value: string } } | string) => {
      setInput(typeof e === 'string' ? e : e.target.value);
    },
    [],
  );

  // ---- 提交 ----
  const handleSubmit = useCallback(
    async (e?: { preventDefault?: () => void }) => {
      e?.preventDefault?.();
      const text = input.trim();
      if (!text || isLoading) return;
      setInput('');
      await runStream(text);
    },
    [input, isLoading, runStream],
  );

  // ---- 追加 ----
  const append = useCallback(
    async (message: { role: 'user'; content: string }) => {
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
        if (prev[i].role === 'assistant') {
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
    if (typeof (agent as Record<string, unknown>).stop === 'function') {
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
    lastPromptRef.current = '';
  }, [isLoading, stop]);

  // ---- 组件卸载时清理 ----
  useEffect(() => {
    return () => {
      runningRef.current = false;
    };
  }, []);

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
