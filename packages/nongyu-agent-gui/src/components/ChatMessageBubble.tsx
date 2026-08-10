import type { ChatMessage } from "nongyu-agent-sdk";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ToolCallCard } from "./ToolCallCard";
import { LoadingDots } from "./LoadingDots";

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

/**
 * 单条消息气泡 — user / assistant 分叉渲染
 */
export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === "user";

  // --- User 消息 ---
  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-2">
        <div className="max-w-[75%] bg-emerald-500 text-white rounded-2xl rounded-br-md px-4 py-2.5 shadow-sm">
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  // --- Assistant 消息 ---
  const isLoading = message.status === "pending" || message.status === "streaming";
  const hasContent = message.content.length > 0;

  return (
    <div className="flex justify-start px-4 py-2">
      <div className="max-w-[85%] w-full">
        {/* AI 头像 + 名称 */}
        <div className="flex items-center gap-2 mb-1 ml-1">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-3.5 h-3.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-xs font-medium text-slate-500">农小屿</span>
        </div>

        {/* 消息内容气泡 */}
        <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
          {/* 加载中且无内容 */}
          {isLoading && !hasContent && <LoadingDots />}

          {/* 正文内容 */}
          {hasContent && <MarkdownRenderer content={message.content} />}

          {/* 工具调用 */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <ToolCallCard toolCalls={message.toolCalls} />
          )}

          {/* 错误 */}
          {message.status === "error" && message.error && (
            <div className="mt-2 text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
              {message.error}
            </div>
          )}

          {/* 流式进行中的光标动画 */}
          {isLoading && hasContent && (
            <span className="inline-block w-0.5 h-4 bg-emerald-400 align-middle ml-0.5 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
