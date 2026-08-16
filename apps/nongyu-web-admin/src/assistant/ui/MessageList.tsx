import type { ChatMessage } from "nongyu-agent-sdk";
import { AssistantMarkdown } from "./AssistantMarkdown";
import { ToolCallView } from "./ToolCallView";

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
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
      {messages.map((msg, index) => (
        <div key={msg.id} className={msg.role === "user" ? "self-end max-w-[90%]" : "w-full"}>
          {msg.role === "user" ? (
            <div className="rounded-2xl bg-brand px-3 py-2 text-sm text-white">{msg.content}</div>
          ) : (
            <div className="flex flex-col gap-2">
              {msg.toolCalls?.map((tc) => (
                <ToolCallView key={tc.callId ?? `${tc.toolName}-${index}`} tc={tc} />
              ))}
              <AssistantMarkdown content={msg.content} />
              {msg.status === "error" ? (
                <p className="text-xs text-red-600">{msg.error ?? "生成失败"}</p>
              ) : null}
              {!isLoading &&
              onRegenerate &&
              index === messages.length - 1 &&
              last?.role === "assistant" ? (
                <button
                  type="button"
                  className="self-start text-xs text-brand"
                  onClick={onRegenerate}
                >
                  重新生成
                </button>
              ) : null}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
