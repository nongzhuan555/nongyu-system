import { createThemedStyles } from "@/theme/createThemedStyles";
import { memo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Markdown from "react-native-markdown-display";
import remend from "remend";
import { shouldShowToolUI, type ChatMessage } from "nongyu-agent-sdk";
import { useThemeTokens } from "@/theme/ThemeProvider";
import { ToolCallView } from "./ToolCallView";

/** 流式半截语法补全：与 Web AssistantMarkdown 对齐 */
const STREAM_HEAL_OPTIONS = {
  linkMode: "text-only" as const,
  katex: false,
  inlineKatex: false,
};

interface AssistantMessageProps {
  message: ChatMessage;
  onAction?: (text: string) => void;
  /** 是否为列表最后一条 assistant，且未在生成中 */
  showActions?: boolean;
  onRegenerate?: () => void;
}

export function isEmptyAssistantReply(message: ChatMessage): boolean {
  if (message.role !== "assistant" || message.status !== "done") return false;
  if (message.content.trim().length > 0) return false;
  const tools = message.toolCalls ?? [];
  return !tools.some((tc) => tc.status === "done");
}

/** 操作条文案；不适用则 null */
export function getAssistantActionLabel(message: ChatMessage): "重试" | "重新生成" | null {
  if (message.status === "error" || message.status === "stopped") return "重试";
  if (message.status === "done" && isEmptyAssistantReply(message)) return "重试";
  if (message.status === "done") return "重新生成";
  return null;
}

/**
 * assistant：无气泡全宽排版（Claude / ChatGPT 风格）
 * 流式与完成后均走 Markdown；流式时 remend 补半截语法（对齐 Web）
 * 先按 showUI 过滤，再对可见工具 ≥2 时默认只展示最后一条，可展开查看全部。
 */
function AssistantMessageInner({
  message,
  onAction,
  showActions,
  onRegenerate,
}: AssistantMessageProps) {
  const styles = useStyles();
  const markdownStyles = useMarkdownStyles();
  const t = useThemeTokens();
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const isStreaming = message.status === "streaming" || message.status === "pending";
  const toolCallsForUi = (message.toolCalls ?? []).filter(shouldShowToolUI);
  const showTyping = isStreaming && !message.content && toolCallsForUi.length === 0;
  const actionLabel = showActions ? getAssistantActionLabel(message) : null;
  const canCollapseTools = toolCallsForUi.length > 1;
  const visibleToolCalls =
    !canCollapseTools || toolsExpanded ? toolCallsForUi : toolCallsForUi.slice(-1);
  const hiddenToolCount = canCollapseTools && !toolsExpanded ? toolCallsForUi.length - 1 : 0;
  const markdownSource = isStreaming
    ? remend(message.content, STREAM_HEAL_OPTIONS)
    : message.content;

  return (
    <View style={styles.root}>
      {showTyping ? (
        <View style={styles.typing}>
          <ActivityIndicator size="small" color={t.color.brand} />
          <Text style={styles.typingText}>思考中</Text>
        </View>
      ) : null}

      {message.content ? <Markdown style={markdownStyles}>{markdownSource}</Markdown> : null}

      {toolCallsForUi.length > 0 ? (
        <View style={styles.tools}>
          {hiddenToolCount > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`展开此前 ${hiddenToolCount} 个工具调用`}
              onPress={() => setToolsExpanded(true)}
              style={({ pressed }) => [styles.toolsToggle, pressed && styles.toolsTogglePressed]}
            >
              <Text style={styles.toolsToggleText}>已折叠 {hiddenToolCount} 个工具调用 · 展开</Text>
            </Pressable>
          ) : null}

          {visibleToolCalls.map((tc) => (
            <ToolCallView key={tc.callId ?? tc.toolName} tc={tc} onAction={onAction} />
          ))}

          {canCollapseTools && toolsExpanded ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="收起工具调用"
              onPress={() => setToolsExpanded(false)}
              style={({ pressed }) => [styles.toolsToggle, pressed && styles.toolsTogglePressed]}
            >
              <Text style={styles.toolsToggleText}>收起工具调用</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {message.status === "stopped" ? <Text style={styles.stopped}>已停止</Text> : null}

      {message.status === "error" && message.error ? (
        <Text style={styles.error}>{message.error}</Text>
      ) : null}

      {actionLabel && onRegenerate ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={onRegenerate}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export const AssistantMessage = memo(AssistantMessageInner);

const useStyles = createThemedStyles((t) => ({
  root: {
    alignSelf: "stretch",
    paddingVertical: 10,
    paddingRight: t.space.sm,
  },
  typing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  typingText: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
  },
  tools: {
    marginTop: t.space.sm,
    gap: t.space.sm,
  },
  toolsToggle: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  toolsTogglePressed: {
    opacity: 0.7,
  },
  toolsToggleText: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    fontWeight: "500",
  },
  error: {
    fontSize: t.fontSize.sm,
    color: t.color.danger,
    marginTop: t.space.sm,
    lineHeight: 20,
  },
  stopped: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    marginTop: t.space.sm,
  },
  actions: {
    flexDirection: "row",
    marginTop: t.space.sm,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: t.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
  },
  actionBtnPressed: {
    backgroundColor: t.color.surfaceVariant,
  },
  actionText: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    fontWeight: "500",
  },
}));

const useMarkdownStyles = createThemedStyles((t) => ({
  body: {
    fontSize: 15,
    color: t.color.text,
    lineHeight: 24,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 10,
  },
  heading1: {
    fontSize: t.fontSize.xl,
    fontWeight: "600",
    color: t.color.text,
    marginTop: 12,
    marginBottom: 8,
  },
  heading2: {
    fontSize: t.fontSize.lg,
    fontWeight: "600",
    color: t.color.text,
    marginTop: 10,
    marginBottom: 6,
  },
  heading3: {
    fontSize: 16,
    fontWeight: "600",
    color: t.color.text,
    marginTop: 8,
    marginBottom: 4,
  },
  link: {
    color: t.color.brand,
    textDecorationLine: "none" as const,
  },
  list_item: {
    color: t.color.text,
    fontSize: 15,
    lineHeight: 24,
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  code_inline: {
    backgroundColor: t.color.surfaceVariant,
    color: t.color.text,
    fontFamily: "monospace",
    fontSize: 13,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  code_block: {
    backgroundColor: t.color.surfaceVariant,
    color: t.color.text,
    fontFamily: "monospace",
    fontSize: 13,
    padding: t.space.md,
    borderRadius: t.radius.md,
    marginVertical: 8,
  },
  fence: {
    backgroundColor: t.color.surfaceVariant,
    color: t.color.text,
    fontFamily: "monospace",
    fontSize: 13,
    padding: t.space.md,
    borderRadius: t.radius.md,
    marginVertical: 8,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: t.color.border,
    paddingLeft: t.space.md,
    marginVertical: 8,
    color: t.color.textSecondary,
  },
  strong: {
    fontWeight: "600",
    color: t.color.text,
  },
  em: {
    fontStyle: "italic" as const,
    color: t.color.text,
  },
  hr: {
    backgroundColor: t.color.border,
    height: 1,
    marginVertical: 12,
  },
}));
