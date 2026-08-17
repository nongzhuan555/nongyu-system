import type { ChatMessage } from "nongyu-agent-sdk";
import { useEffect, useRef } from "react";
import { AssistantMarkdown } from "./AssistantMarkdown";
import { ToolCallView } from "./ToolCallView";

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

function AssistantMessage({
  message,
  showActions,
  onRegenerate,
}: {
  message: ChatMessage;
  showActions: boolean;
  onRegenerate?: () => void;
}) {
  const isStreaming = message.status === "streaming" || message.status === "pending";
  const toolCalls = message.toolCalls ?? [];
  const showTyping = isStreaming && !message.content && toolCalls.length === 0;
  const actionLabel = showActions ? getAssistantActionLabel(message) : null;
  const useMarkdown = !isStreaming && (message.status === "done" || message.status === "stopped");

  return (
    <div className="w-full py-2.5 pr-1">
      {showTyping ? (
        <div className="flex items-center gap-2 py-1 text-sm text-muted">
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          思考中
        </div>
      ) : null}

      {message.content ? (
        useMarkdown ? (
          <AssistantMarkdown content={message.content} />
        ) : (
          <p className="whitespace-pre-wrap text-[15px] leading-6 text-ink">{message.content}</p>
        )
      ) : null}

      {toolCalls.length > 0 ? (
        <div className="mt-2 flex flex-col gap-2">
          {toolCalls.map((tc) => (
            <ToolCallView key={tc.callId ?? tc.toolName} tc={tc} />
          ))}
        </div>
      ) : null}

      {message.status === "stopped" ? <p className="mt-2 text-sm text-muted">已停止</p> : null}

      {message.status === "error" && message.error ? (
        <p className="mt-2 text-sm text-red-600">{message.error}</p>
      ) : null}

      {actionLabel && onRegenerate ? (
        <div className="mt-2">
          <button
            type="button"
            className="rounded-lg border border-line-soft px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-elev"
            onClick={onRegenerate}
          >
            {actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function MessageList({
  messages,
  isLoading,
  onRegenerate,
}: {
  messages: ChatMessage[];
  isLoading: boolean;
  onRegenerate?: () => void;
}) {
  const last = messages[messages.length - 1];
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  return (
    <div
      ref={scrollerRef}
      className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-3 pb-4"
      onScroll={(event) => {
        const el = event.currentTarget;
        const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
        stickToBottomRef.current = distance < 64;
      }}
    >
      {messages.map((msg, index) => {
        if (msg.role === "user") {
          return (
            <div key={msg.id} className="my-2.5 flex justify-end">
              <div className="max-w-[82%] rounded-[20px] rounded-br-md bg-brand px-4 py-2.5 text-[15px] leading-[22px] text-white">
                {msg.content}
              </div>
            </div>
          );
        }

        const showActions =
          !isLoading &&
          Boolean(onRegenerate) &&
          index === messages.length - 1 &&
          last?.role === "assistant";

        return (
          <AssistantMessage
            key={msg.id}
            message={msg}
            showActions={showActions}
            onRegenerate={onRegenerate}
          />
        );
      })}
    </div>
  );
}
