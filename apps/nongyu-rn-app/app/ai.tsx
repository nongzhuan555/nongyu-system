import { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardEvent,
} from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Agent, ChatMessage } from "nongyu-agent-sdk";
import { MessageList } from "@/agent-ui/MessageList";
import { ChatLoadingSkeleton } from "@/agent-ui/ChatLoadingSkeleton";
import { getAssistantActionLabel } from "@/agent-ui/AssistantMessage";
import { getOrCreateNongyuAgent } from "@/agent/agent";
import { agentChatRunner, useAgentChatRunner, useAgentChatRunnerActions } from "@/agent/chatRunner";
import {
  clearSessions,
  deleteSession,
  getActiveSessionId,
  getSession,
  listSessions,
  SessionDrawer,
  setActiveSessionId,
  touchSession,
  type AgentChatSession,
} from "@/agent/session";
import { confirm } from "@/components/ui/confirm";
import { toast } from "@/components/ui/toast";
import { trackClick } from "@/modules/telemetry";
import { useSessionStore } from "@/stores/session";
import { createThemedStyles } from "@/theme/createThemedStyles";
import { useThemeTokens } from "@/theme/ThemeProvider";
import { themeHexToRgba } from "@/theme/buildThemeTokens";

/**
 * 农屿 AI 聊天页：高级简约壳层 + 会话管理（生成由模块级 Runner 保活）
 */
export default function AiScreen() {
  const styles = useStyles();
  const t = useThemeTokens();
  const insets = useSafeAreaInsets();
  const studentId = useSessionStore((s) => s.profile?.studentId);
  const runnerSnap = useAgentChatRunner();

  const [agent, setAgent] = useState<Agent | null | undefined>(undefined);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sessions, setSessions] = useState<AgentChatSession[]>([]);
  const [activeSessionId, setActiveId] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState("draft");
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
  const [initialLlmSummary, setInitialLlmSummary] = useState<string | undefined>();
  const [initialLlmCompactedUntilId, setInitialLlmCompactedUntilId] = useState<
    string | undefined
  >();
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeSessionId;
  const chatMountedRef = useRef(false);

  // Runner 落盘创建 session 后同步顶栏活跃 id（不 remount，避免打断流式）
  useEffect(() => {
    if (!runnerSnap.sessionId) return;
    if (activeIdRef.current === runnerSnap.sessionId) return;
    if (runnerSnap.runKey && chatKey.startsWith("draft-") && runnerSnap.isLoading) {
      setActiveId(runnerSnap.sessionId);
    } else if (runnerSnap.runKey === chatKey || runnerSnap.sessionId === activeSessionId) {
      setActiveId(runnerSnap.sessionId);
    }
  }, [runnerSnap.sessionId, runnerSnap.runKey, runnerSnap.isLoading, chatKey, activeSessionId]);

  const refreshSessions = useCallback(() => {
    if (!studentId) {
      setSessions([]);
      return;
    }
    setSessions(listSessions(studentId));
  }, [studentId]);

  // 生成结束后面板未挂载时也刷新侧栏
  useEffect(() => {
    if (!runnerSnap.isLoading && runnerSnap.lastEndReason) {
      refreshSessions();
    }
  }, [runnerSnap.isLoading, runnerSnap.lastEndReason, refreshSessions]);

  const hydrateActive = useCallback(
    (forceReloadMessages = false) => {
      if (!studentId) {
        if (activeIdRef.current !== null) {
          setActiveId(null);
          setChatKey(`draft-${Date.now()}`);
          setInitialMessages([]);
          setInitialLlmSummary(undefined);
          setInitialLlmCompactedUntilId(undefined);
        }
        return;
      }
      const activeId = getActiveSessionId(studentId);
      if (activeId) {
        const session = getSession(studentId, activeId);
        if (session) {
          const sameSession = activeIdRef.current === session.id;
          if (sameSession && !forceReloadMessages) {
            refreshSessions();
            return;
          }
          // 若 Runner 正在该会话生成，用 live 态，勿用陈旧落盘覆盖
          if (agentChatRunner.matchesView(session.id, session.id)) {
            setActiveId(session.id);
            setChatKey(session.id);
            setInitialMessages(agentChatRunner.getSnapshot().messages);
            setInitialLlmSummary(agentChatRunner.getSnapshot().llmSummary);
            setInitialLlmCompactedUntilId(agentChatRunner.getSnapshot().llmCompactedUntilId);
            refreshSessions();
            return;
          }
          setActiveId(session.id);
          setChatKey(session.id);
          setInitialMessages(session.messages);
          setInitialLlmSummary(session.llmSummary);
          setInitialLlmCompactedUntilId(session.llmCompactedUntilId);
          refreshSessions();
          return;
        }
      }
      if (activeIdRef.current === null && !forceReloadMessages) {
        refreshSessions();
        return;
      }
      setActiveId(null);
      setActiveSessionId(studentId, null);
      setChatKey(`draft-${Date.now()}`);
      setInitialMessages([]);
      setInitialLlmSummary(undefined);
      setInitialLlmCompactedUntilId(undefined);
      refreshSessions();
    },
    [studentId, refreshSessions],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const next = await getOrCreateNongyuAgent();
        if (!cancelled) setAgent(next);
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      const panelWasGone = !chatMountedRef.current;
      hydrateActive(panelWasGone);
      // 离页不 stop：仅取消焦点，Runner 继续
      return () => {
        chatMountedRef.current = false;
      };
    }, [hydrateActive]),
  );

  useEffect(() => {
    if (!drawerOpen) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setDrawerOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [drawerOpen]);

  const openDrawer = () => {
    refreshSessions();
    setDrawerOpen(true);
  };

  const startNewChat = () => {
    trackClick("agent_session_new");
    if (studentId) setActiveSessionId(studentId, null);
    setActiveId(null);
    setChatKey(`draft-${Date.now()}`);
    setInitialMessages([]);
    setInitialLlmSummary(undefined);
    setInitialLlmCompactedUntilId(undefined);
    setDrawerOpen(false);
  };

  const selectSession = (sessionId: string) => {
    trackClick("agent_session_switch");
    if (!studentId) return;
    if (sessionId === activeSessionId) {
      setDrawerOpen(false);
      return;
    }
    const live = agentChatRunner.matchesView(sessionId, sessionId);
    const session = touchSession(studentId, sessionId);
    if (!session) {
      toast.error("会话不存在");
      refreshSessions();
      return;
    }
    setActiveId(session.id);
    setChatKey(session.id);
    setInitialMessages(live ? agentChatRunner.getSnapshot().messages : session.messages);
    setInitialLlmSummary(live ? agentChatRunner.getSnapshot().llmSummary : session.llmSummary);
    setInitialLlmCompactedUntilId(
      live ? agentChatRunner.getSnapshot().llmCompactedUntilId : session.llmCompactedUntilId,
    );
    refreshSessions();
    setDrawerOpen(false);
  };

  const handleDelete = (sessionId: string) => {
    if (!studentId) return;
    agentChatRunner.stopIfSession(sessionId);
    deleteSession(studentId, sessionId);
    refreshSessions();
    if (activeSessionId === sessionId) {
      setActiveId(null);
      setActiveSessionId(studentId, null);
      setChatKey(`draft-${Date.now()}`);
      setInitialMessages([]);
      setInitialLlmSummary(undefined);
      setInitialLlmCompactedUntilId(undefined);
    }
    toast.success("删除成功");
  };

  const handleClearAll = () => {
    if (!studentId) return;
    agentChatRunner.reset();
    clearSessions(studentId);
    refreshSessions();
    setActiveId(null);
    setChatKey(`draft-${Date.now()}`);
    setInitialMessages([]);
    setInitialLlmSummary(undefined);
    setInitialLlmCompactedUntilId(undefined);
    setDrawerOpen(false);
    toast.success("已清空全部会话");
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="会话列表"
          hitSlop={10}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
          onPress={openDrawer}
        >
          <Ionicons name="menu-outline" size={22} color={t.color.text} />
        </Pressable>
        <Text style={styles.headerTitle}>农屿 AI</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="新对话"
          hitSlop={10}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
          onPress={startNewChat}
        >
          <Ionicons name="create-outline" size={20} color={t.color.text} />
        </Pressable>
      </View>

      {agent === undefined ? (
        <ChatLoadingSkeleton />
      ) : agent === null ? (
        <UnconfiguredPanel />
      ) : (
        <AiChatPanel
          key={chatKey}
          agent={agent}
          viewKey={chatKey}
          bottomInset={insets.bottom}
          studentId={studentId}
          sessionId={activeSessionId}
          initialMessages={initialMessages}
          initialLlmSummary={initialLlmSummary}
          initialLlmCompactedUntilId={initialLlmCompactedUntilId}
          onMountChange={(mounted) => {
            chatMountedRef.current = mounted;
          }}
          onSessionsMaybeChanged={refreshSessions}
        />
      )}

      <SessionDrawer
        visible={drawerOpen}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onClose={() => setDrawerOpen(false)}
        onNewChat={startNewChat}
        onSelect={selectSession}
        onDelete={handleDelete}
        onClearAll={handleClearAll}
      />
    </View>
  );
}

function UnconfiguredPanel() {
  const styles = useStyles();
  const t = useThemeTokens();
  const router = useRouter();
  return (
    <View style={styles.center}>
      <View style={[styles.emptyIcon, { backgroundColor: themeHexToRgba(t.color.brand, 0.1) }]}>
        <Ionicons name="key-outline" size={28} color={t.color.brand} />
      </View>
      <Text style={styles.emptyTitle}>暂不可用平台模型</Text>
      <Text style={styles.hint}>请先登录农屿以使用平台免费模型，或在设置中配置自有 API Key</Text>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.9 }]}
        onPress={() => router.push("/mine/settings/agent" as Href)}
      >
        <Text style={styles.settingsBtnText}>去设置</Text>
      </Pressable>
    </View>
  );
}

type AiChatPanelProps = {
  agent: Agent;
  viewKey: string;
  bottomInset: number;
  studentId: string | undefined;
  sessionId: string | null;
  initialMessages: ChatMessage[];
  initialLlmSummary?: string;
  initialLlmCompactedUntilId?: string;
  onMountChange: (mounted: boolean) => void;
  onSessionsMaybeChanged: () => void;
};

function AiChatPanel({
  agent,
  viewKey,
  bottomInset,
  sessionId,
  initialMessages,
  initialLlmSummary,
  initialLlmCompactedUntilId,
  onMountChange,
  onSessionsMaybeChanged,
}: AiChatPanelProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  const snap = useAgentChatRunner();
  const { send, regenerate, stop } = useAgentChatRunnerActions();
  const [input, setInput] = useState("");

  const isLive = agentChatRunner.matchesView(viewKey, sessionId);
  const messages = isLive ? snap.messages : initialMessages;
  const isLoading = isLive && snap.isLoading;
  const llmSummary = isLive ? snap.llmSummary : initialLlmSummary;
  const llmCompactedUntilId = isLive ? snap.llmCompactedUntilId : initialLlmCompactedUntilId;

  useEffect(() => {
    onMountChange(true);
    return () => onMountChange(false);
  }, [onMountChange]);

  useEffect(() => {
    if (isLive && !snap.isLoading && snap.lastEndReason) {
      onSessionsMaybeChanged();
    }
  }, [isLive, snap.isLoading, snap.lastEndReason, onSessionsMaybeChanged]);

  const submitPrompt = async (prompt: string, historyOverride?: ChatMessage[]) => {
    const historyMessages =
      historyOverride ??
      (agentChatRunner.matchesView(viewKey, sessionId)
        ? agentChatRunner.getSnapshot().messages
        : messages);
    const result = await send({
      agent,
      viewKey,
      sessionId,
      prompt,
      historyMessages,
      llmSummary,
      llmCompactedUntilId,
    });
    if (result === "busy") {
      toast.info("请等待当前回复完成");
    }
  };

  const onAction = (text: string) => {
    void submitPrompt(text);
  };

  const onRegenerate = () => {
    if (isLoading) return;
    const liveMessages = agentChatRunner.matchesView(viewKey, sessionId)
      ? agentChatRunner.getSnapshot().messages
      : messages;
    const last = liveMessages[liveMessages.length - 1];
    if (!last || last.role !== "assistant") return;
    const withoutAssistant = liveMessages.slice(0, -1);
    const prevUser = withoutAssistant[withoutAssistant.length - 1];
    if (!prevUser || prevUser.role !== "user") return;

    const actionLabel = getAssistantActionLabel(last);
    if (!actionLabel) return;

    void (async () => {
      if (actionLabel === "重新生成") {
        const ok = await confirm({
          title: "重新生成",
          message: "将丢弃当前回复并重新生成，是否继续？",
          confirmText: "重新生成",
          cancelText: "取消",
        });
        if (!ok) return;
      }

      const result = await regenerate({
        agent,
        viewKey,
        sessionId,
        historyMessages: withoutAssistant,
        llmSummary,
        llmCompactedUntilId,
      });
      if (result === "busy") {
        toast.info("请等待当前回复完成");
      }
    })();
  };

  const onSend = () => {
    if (isLoading) return;
    const text = input.trim();
    if (!text) return;
    trackClick("agent_send");
    setInput("");
    const history = agentChatRunner.matchesView(viewKey, sessionId)
      ? agentChatRunner.getSnapshot().messages
      : messages;
    void submitPrompt(text, history);
  };

  const onStop = () => {
    trackClick("agent_stop");
    void (async () => {
      const ok = await confirm({
        title: "停止生成",
        message: "将停止当前回复，已生成内容会保留。",
        confirmText: "停止",
        cancelText: "取消",
      });
      if (!ok) return;
      stop();
    })();
  };

  const inputTrimmed = input.trim();
  /** 生成中禁用输入，仅展示 Stop；结束后才可再发 */
  const showStop = isLoading;
  const sendEnabled = !isLoading && Boolean(inputTrimmed);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
    };
    const onHide = () => setKeyboardHeight(0);
    const subShow = Keyboard.addListener(showEvent, onShow);
    const subHide = Keyboard.addListener(hideEvent, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  const composerBottomPad = keyboardHeight > 0 ? keyboardHeight + 20 : Math.max(bottomInset, 10);

  return (
    <View style={styles.body}>
      <View style={styles.listWrap}>
        <MessageList
          messages={messages}
          onAction={onAction}
          actionsEnabled={!isLoading}
          onRegenerate={onRegenerate}
        />
      </View>

      <View style={[styles.composerWrap, { paddingBottom: composerBottomPad }]}>
        <View style={[styles.composer, isLoading && styles.composerDisabled]}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={isLoading ? "生成中，请稍候…" : "有什么想对农小屿说的吗？"}
            placeholderTextColor={t.color.textSecondary}
            multiline
            editable={!isLoading}
            accessibilityState={{ disabled: isLoading }}
          />
          {showStop ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="停止生成"
              style={[styles.sendBtn, styles.stopBtn]}
              onPress={onStop}
            >
              <Ionicons name="stop" size={16} color={t.color.onBrand} />
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isLoading ? "打断并发送" : "发送"}
              style={[styles.sendBtn, !sendEnabled && styles.sendBtnDisabled]}
              onPress={onSend}
              disabled={!sendEnabled}
            >
              <Ionicons
                name="arrow-up"
                size={18}
                color={sendEnabled ? t.color.onBrand : t.color.textSecondary}
              />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  root: {
    flex: 1,
    backgroundColor: t.color.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: t.space.sm,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.color.border,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBtnPressed: {
    backgroundColor: t.color.surfaceVariant,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
    color: t.color.text,
    letterSpacing: 0.2,
  },
  body: {
    flex: 1,
  },
  listWrap: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: t.space.lg,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: t.space.md,
  },
  emptyTitle: {
    fontSize: t.fontSize.lg,
    fontWeight: "600",
    color: t.color.text,
    marginBottom: t.space.sm,
  },
  hint: {
    fontSize: t.fontSize.md,
    color: t.color.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  settingsBtn: {
    marginTop: t.space.lg,
    backgroundColor: t.color.brand,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: t.radius.full,
  },
  settingsBtnText: {
    color: t.color.onBrand,
    fontWeight: "600",
    fontSize: t.fontSize.md,
  },
  composerWrap: {
    paddingHorizontal: t.space.md,
    paddingTop: t.space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.color.border,
    backgroundColor: t.color.background,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    backgroundColor: t.color.surface,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 48,
  },
  composerDisabled: {
    opacity: 0.72,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    paddingTop: Platform.OS === "ios" ? 10 : 8,
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
    paddingRight: 8,
    color: t.color.text,
    fontSize: 15,
    lineHeight: 22,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.color.brand,
    marginBottom: 2,
  },
  stopBtn: {
    backgroundColor: t.color.text,
  },
  sendBtnDisabled: {
    backgroundColor: t.color.surfaceVariant,
  },
}));
