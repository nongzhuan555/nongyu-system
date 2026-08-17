import { useCallback, useEffect } from "react";
import { toast } from "@/components/ui/toast";
import { useSessionStore } from "@/stores/session";
import {
  getActiveSessionId,
  patchSessionLlmContext,
  setActiveSessionId,
  upsertSession,
} from "@/agent/session";
import { agentChatRunner } from "./agentChatRunner";
import { installAgentChatBackgroundKeepAlive } from "./backgroundKeepAlive";
import { useAgentChatRunnerBridge } from "./useAgentChatRunner";

/**
 * 根级挂载：落盘 / 压缩 Toast / 后台保活不依赖 AI 页是否打开。
 */
export function AgentChatRuntimeHost() {
  const studentId = useSessionStore((s) => s.profile?.studentId);

  useEffect(() => {
    installAgentChatBackgroundKeepAlive();
  }, []);

  const onPersist = useCallback(
    (p: {
      runKey: string;
      sessionId: string | null;
      messages: import("nongyu-agent-sdk").ChatMessage[];
      reason: "first-user" | "complete" | "stop" | "error";
    }) => {
      if (!studentId) return;
      const hasUser = p.messages.some((m) => m.role === "user" && m.content.trim());
      if (!hasUser) return;

      const touch = p.reason === "first-user" || p.reason === "complete" || p.reason === "stop";
      const saved = upsertSession(studentId, {
        sessionId: p.sessionId,
        messages: p.messages,
        touch,
      });
      if (!saved) return;

      // 新建会话：绑定 Runner；仅当当前无活跃会话时写入活跃 id（避免打断用户已切换的会话）
      if (!p.sessionId) {
        agentChatRunner.bindSessionId(saved.id);
        if (getActiveSessionId(studentId) == null) {
          setActiveSessionId(studentId, saved.id);
        }
      }
    },
    [studentId],
  );

  const onCompact = useCallback(
    (payload: { ok: boolean; llmSummary?: string; llmCompactedUntilId?: string }) => {
      if (payload.ok) {
        toast.info("当前会话过长，已做摘要压缩");
      } else {
        toast.info("会话过长，摘要失败，已仅保留最近对话");
      }
      const snap = agentChatRunner.getSnapshot();
      if (!studentId || !snap.sessionId) return;
      patchSessionLlmContext(studentId, snap.sessionId, {
        ok: payload.ok,
        llmSummary: payload.llmSummary,
        llmCompactedUntilId: payload.llmCompactedUntilId,
      });
    },
    [studentId],
  );

  const onError = useCallback((error: Error) => {
    toast.error("对话失败", { description: error.message });
  }, []);

  useAgentChatRunnerBridge({ onPersist, onCompact, onError });

  return null;
}
