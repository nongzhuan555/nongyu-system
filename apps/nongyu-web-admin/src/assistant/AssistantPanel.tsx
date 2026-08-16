import { Button, Drawer, Grid, Input, Space, Tabs } from "antd";
import { useAgentChat, type Agent, type ChatMessage } from "nongyu-agent-sdk";
import { useEffect, useState } from "react";
import { useAuthStore } from "../stores/authStore";
import { getOrCreateAdminAgent, invalidateAdminAgent } from "./agent";
import { AgentSettingsForm } from "./ui/AgentSettingsForm";
import { MessageList } from "./ui/MessageList";
import { SessionList } from "./ui/SessionList";
import "./ui/register";
import {
  clearSessions,
  deleteSession,
  getActiveSessionId,
  getSession,
  listSessions,
  patchSessionLlmContext,
  setActiveSessionId,
  upsertSession,
} from "./storage/sessionRepository";
import type { AgentChatSession } from "./storage/sessionTypes";

const SUGGESTIONS = ["今天日活有多少", "近 7 日新增用户趋势", "用户按学院分布"];

function ChatSessionView({
  agent,
  adminUserId,
  session,
  onSessionId,
}: {
  agent: Agent;
  adminUserId: number;
  session: AgentChatSession | null;
  onSessionId: (id: string) => void;
}) {
  const chat = useAgentChat({
    agent,
    initialMessages: session?.messages ?? [],
    llmSummary: session?.llmSummary,
    llmCompactedUntilId: session?.llmCompactedUntilId,
    textUpdateThrottleMs: 40,
    onContextCompact: (payload) => {
      const id = session?.id;
      if (!id) return;
      patchSessionLlmContext(adminUserId, id, payload);
    },
  });

  useEffect(() => {
    if (chat.isLoading) return;
    const saved = upsertSession(adminUserId, {
      sessionId: session?.id,
      messages: chat.messages,
    });
    if (saved && saved.id !== session?.id) onSessionId(saved.id);
  }, [adminUserId, chat.isLoading, chat.messages, onSessionId, session?.id]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {chat.messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm text-muted">只读问数助手。可问日活、用户分布或查学号。</p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((q) => (
              <Button
                key={q}
                size="small"
                onClick={() => {
                  chat.setInput(q);
                  void chat.append({ role: "user", content: q });
                }}
              >
                {q}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <MessageList
          messages={chat.messages as ChatMessage[]}
          isLoading={chat.isLoading}
          onRegenerate={() => void chat.reload()}
        />
      )}
      <Space.Compact className="w-full">
        <Input
          className="min-h-11"
          placeholder={chat.isLoading ? "生成中…" : "输入问题"}
          value={chat.input}
          disabled={chat.isLoading}
          onChange={(event) => chat.setInput(event.target.value)}
          onPressEnter={() => {
            if (!chat.isLoading) void chat.handleSubmit();
          }}
        />
        {chat.isLoading ? (
          <Button className="min-h-11" danger onClick={() => chat.stop()}>
            停止
          </Button>
        ) : (
          <Button className="min-h-11" type="primary" onClick={() => void chat.handleSubmit()}>
            发送
          </Button>
        )}
      </Space.Compact>
    </div>
  );
}

export function AssistantPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const screens = Grid.useBreakpoint();
  const isLg = screens.lg ?? true;
  const userId = useAuthStore((s) => s.user?.id);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<AgentChatSession[]>([]);
  const [tab, setTab] = useState("chat");

  function refreshAgent() {
    setAgent(getOrCreateAdminAgent());
  }

  function refreshSessions() {
    if (!userId) return;
    setSessions(listSessions(userId));
  }

  useEffect(() => {
    if (!open || !userId) return;
    refreshAgent();
    const active = getActiveSessionId(userId);
    setSessionId(active);
    refreshSessions();
  }, [open, userId]);

  const session = userId && sessionId ? getSession(userId, sessionId) : null;

  return (
    <Drawer
      title="智慧助手"
      open={open}
      onClose={onClose}
      width={isLg ? 420 : "100%"}
      placement="right"
      destroyOnClose={false}
      zIndex={50}
      styles={{ body: { display: "flex", flexDirection: "column", padding: 16 } }}
    >
      {!userId ? (
        <p className="text-sm text-muted">请先登录</p>
      ) : !agent ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            未配置模型。可填写自有 Key，或确认已登录以使用平台调度。
          </p>
          <AgentSettingsForm onSaved={refreshAgent} />
        </div>
      ) : (
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: "chat",
              label: "对话",
              children: (
                <div className="flex h-[70vh] flex-col">
                  <ChatSessionView
                    key={sessionId ?? "draft"}
                    agent={agent}
                    adminUserId={userId}
                    session={session}
                    onSessionId={(id) => {
                      setSessionId(id);
                      refreshSessions();
                    }}
                  />
                </div>
              ),
            },
            {
              key: "sessions",
              label: "会话",
              children: (
                <SessionList
                  sessions={sessions}
                  activeId={sessionId}
                  onNew={() => {
                    setActiveSessionId(userId, null);
                    setSessionId(null);
                    setTab("chat");
                  }}
                  onSelect={(id) => {
                    setActiveSessionId(userId, id);
                    setSessionId(id);
                    setTab("chat");
                  }}
                  onDelete={(id) => {
                    deleteSession(userId, id);
                    if (sessionId === id) setSessionId(null);
                    refreshSessions();
                  }}
                  onClearAll={() => {
                    clearSessions(userId);
                    setSessionId(null);
                    refreshSessions();
                  }}
                />
              ),
            },
            {
              key: "settings",
              label: "模型",
              children: (
                <AgentSettingsForm
                  onSaved={() => {
                    invalidateAdminAgent();
                    refreshAgent();
                  }}
                />
              ),
            },
          ]}
        />
      )}
    </Drawer>
  );
}
