import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import type { Agent, ChatMessage } from "nongyu-agent-sdk";
import {
  agentChatRunner,
  type AgentChatCompactPayload,
  type AgentChatPersistPayload,
  type AgentChatRunnerSnapshot,
} from "./agentChatRunner";

/**
 * 订阅模块级 AgentChatRunner（离页不卸载生成）。
 */
export function useAgentChatRunner(): AgentChatRunnerSnapshot {
  return useSyncExternalStore(
    (onStoreChange) => agentChatRunner.subscribe(onStoreChange),
    () => agentChatRunner.getSnapshot(),
    () => agentChatRunner.getSnapshot(),
  );
}

export function useAgentChatRunnerActions() {
  const send = useCallback(
    async (params: {
      agent: Agent;
      viewKey: string;
      sessionId: string | null;
      prompt: string;
      historyMessages: ChatMessage[];
      llmSummary?: string;
      llmCompactedUntilId?: string;
    }) => agentChatRunner.send(params),
    [],
  );

  const stop = useCallback(() => {
    agentChatRunner.stop();
  }, []);

  return { send, stop };
}

/** 在 AI 页挂载时注册落盘 / 压缩 / 错误回调 */
export function useAgentChatRunnerBridge(handlers: {
  onPersist: (p: AgentChatPersistPayload) => void;
  onCompact: (p: AgentChatCompactPayload) => void;
  onError: (error: Error) => void;
}): void {
  const persistRef = useRef(handlers.onPersist);
  const compactRef = useRef(handlers.onCompact);
  const errorRef = useRef(handlers.onError);
  persistRef.current = handlers.onPersist;
  compactRef.current = handlers.onCompact;
  errorRef.current = handlers.onError;

  useEffect(() => {
    agentChatRunner.setPersistHandler((p) => persistRef.current(p));
    agentChatRunner.setCompactHandler((p) => compactRef.current(p));
    agentChatRunner.setErrorHandler((error) => errorRef.current(error));
    // 不在 cleanup 清空：Strict Mode / 短暂卸载时 Runner 仍可能落盘
  }, []);
}
