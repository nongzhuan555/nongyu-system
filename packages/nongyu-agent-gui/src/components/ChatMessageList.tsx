import type { ChatMessage } from "nongyu-agent-sdk";
import { useAutoScroll } from "../hooks/useAutoScroll";
import { ChatMessageBubble } from "./ChatMessageBubble";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

/**
 * 消息列表容器 — 自动滚动到底部
 */
export function ChatMessageList({ messages, isLoading }: ChatMessageListProps) {
  const containerRef = useAutoScroll([messages, isLoading]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto overscroll-contain py-4 space-y-1">
      {messages.map((msg) => (
        <ChatMessageBubble key={msg.id} message={msg} />
      ))}

      {/* 底部留白，确保最后一条消息不被输入框遮挡 */}
      <div className="h-4" />
    </div>
  );
}
