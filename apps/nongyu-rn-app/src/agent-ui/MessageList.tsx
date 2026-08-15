import { createThemedStyles } from "@/theme/createThemedStyles";
import { useCallback, memo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { FlashList, FlashListRef, type ListRenderItem } from "@shopify/flash-list";
import type { ChatMessage } from "nongyu-agent-sdk";
import { AssistantMessage } from "./AssistantMessage";
import { ChatEmptyState } from "./ChatEmptyState";

interface MessageListProps {
  messages: ChatMessage[];
  onAction?: (text: string) => void;
}

/** 用户消息：右对齐轻气泡 */
const UserBubble = memo(function UserBubble({ content }: { content: string }) {
  const styles = useStyles();
  return (
    <View style={styles.userRow}>
      <View style={styles.userBubble}>
        <Text style={styles.userText}>{content}</Text>
      </View>
    </View>
  );
});

/** 单行消息：按 role 分发 */
const MessageRow = memo(function MessageRow({
  message,
  onAction,
}: {
  message: ChatMessage;
  onAction?: (text: string) => void;
}) {
  if (message.role === "user") {
    return <UserBubble content={message.content} />;
  }
  return <AssistantMessage message={message} onAction={onAction} />;
});

/** 消息列表：空态 / FlashList + 智能跟随滚动 */
export function MessageList({ messages, onAction }: MessageListProps) {
  const styles = useStyles();
  const listRef = useRef<FlashListRef<ChatMessage>>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const hasUserMessage = messages.some((m) => m.role === "user");

  const renderItem: ListRenderItem<ChatMessage> = useCallback(
    ({ item }) => <MessageRow message={item} onAction={onAction} />,
    [onAction],
  );

  const keyExtractor = useCallback((m: ChatMessage) => m.id, []);

  const onContentSizeChange = useCallback(() => {
    if (isAtBottom) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [isAtBottom]);

  const onScroll = useCallback(
    (e: {
      nativeEvent: {
        layoutMeasurement: { height: number };
        contentOffset: { y: number };
        contentSize: { height: number };
      };
    }) => {
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
      setIsAtBottom(distanceFromBottom < 60);
    },
    [],
  );

  if (!hasUserMessage) {
    return (
      <ChatEmptyState
        onSuggestion={(text) => {
          onAction?.(text);
        }}
      />
    );
  }

  return (
    <FlashList
      ref={listRef}
      data={messages}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onContentSizeChange={onContentSizeChange}
      onScroll={onScroll}
      scrollEventThrottle={64}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
}

const useStyles = createThemedStyles((t) => ({
  list: {
    paddingHorizontal: t.space.md,
    paddingTop: t.space.md,
    paddingBottom: t.space.xl,
  },
  userRow: {
    alignItems: "flex-end",
    marginVertical: 10,
  },
  userBubble: {
    maxWidth: "82%",
    backgroundColor: t.color.brand,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 20,
    borderBottomRightRadius: 6,
  },
  userText: {
    fontSize: 15,
    color: t.color.onBrand,
    lineHeight: 22,
  },
}));
