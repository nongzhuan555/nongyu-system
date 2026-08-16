import { createThemedStyles } from "@/theme/createThemedStyles";
import { memo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Markdown from "react-native-markdown-display";
import type { ChatMessage } from "nongyu-agent-sdk";
import { useThemeTokens } from "@/theme/ThemeProvider";
import { ToolCallView } from "./ToolCallView";

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
 * 流式用纯 Text，完成后切 Markdown
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
  const isStreaming = message.status === "streaming" || message.status === "pending";
  const toolCalls = message.toolCalls ?? [];
  const showTyping = isStreaming && !message.content && toolCalls.length === 0;
  const actionLabel = showActions ? getAssistantActionLabel(message) : null;
  const useMarkdown = !isStreaming && (message.status === "done" || message.status === "stopped");

  return (
    <View style={styles.root}>
      {showTyping ? (
        <View style={styles.typing}>
          <ActivityIndicator size="small" color={t.color.brand} />
          <Text style={styles.typingText}>思考中</Text>
        </View>
      ) : null}

      {message.content ? (
        useMarkdown ? (
          <Markdown style={markdownStyles}>{message.content}</Markdown>
        ) : (
          <Text style={styles.text}>{message.content}</Text>
        )
      ) : null}

      {toolCalls.length > 0 ? (
        <View style={styles.tools}>
          {toolCalls.map((tc) => (
            <ToolCallView key={tc.callId ?? tc.toolName} tc={tc} onAction={onAction} />
          ))}
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
  text: {
    fontSize: 15,
    color: t.color.text,
    lineHeight: 24,
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
