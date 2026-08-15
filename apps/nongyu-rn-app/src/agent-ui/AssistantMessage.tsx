import { createThemedStyles } from "@/theme/createThemedStyles";
import { memo } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import Markdown from "react-native-markdown-display";
import type { ChatMessage } from "nongyu-agent-sdk";
import { useThemeTokens } from "@/theme/ThemeProvider";
import { ToolCallView } from "./ToolCallView";

interface AssistantMessageProps {
  message: ChatMessage;
  onAction?: (text: string) => void;
}

/**
 * assistant：无气泡全宽排版（Claude / ChatGPT 风格）
 * 流式用纯 Text，完成后切 Markdown
 */
function AssistantMessageInner({ message, onAction }: AssistantMessageProps) {
  const styles = useStyles();
  const markdownStyles = useMarkdownStyles();
  const t = useThemeTokens();
  const isStreaming = message.status === "streaming" || message.status === "pending";
  const toolCalls = message.toolCalls ?? [];
  const showTyping = isStreaming && !message.content && toolCalls.length === 0;

  return (
    <View style={styles.root}>
      {showTyping ? (
        <View style={styles.typing}>
          <ActivityIndicator size="small" color={t.color.brand} />
          <Text style={styles.typingText}>思考中</Text>
        </View>
      ) : null}

      {message.content ? (
        isStreaming ? (
          <Text style={styles.text}>{message.content}</Text>
        ) : (
          <Markdown style={markdownStyles}>{message.content}</Markdown>
        )
      ) : null}

      {toolCalls.length > 0 ? (
        <View style={styles.tools}>
          {toolCalls.map((tc) => (
            <ToolCallView key={tc.callId ?? tc.toolName} tc={tc} onAction={onAction} />
          ))}
        </View>
      ) : null}

      {message.status === "error" && message.error ? (
        <Text style={styles.error}>{message.error}</Text>
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
