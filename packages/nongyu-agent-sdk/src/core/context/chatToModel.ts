import type { ToolCallRecord } from "../../types/agent";
import type { ToolCall } from "../../types/model";
import type { Message } from "../../types/message";
import type { ChatMessage } from "../../hooks/types";

function stringifyToolPayload(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function isInjectableChatMessage(message: ChatMessage): boolean {
  if (message.role === "assistant" && message.id.startsWith("welcome-")) return false;
  if (message.status === "pending" && !message.content && !message.toolCalls?.length) return false;
  if (message.status === "error" && !message.content.trim() && !message.toolCalls?.length) {
    return false;
  }
  return true;
}

/**
 * 将 UI ChatMessage 展开为模型 Message（含 tool_calls / tool 结果）。
 * 展开出的 tool 消息复用所属 assistant 的 id，便于压缩游标对齐 UI。
 */
export function chatMessagesToModelMessages(messages: ChatMessage[]): Message[] {
  const result: Message[] = [];

  for (const chat of messages) {
    if (!isInjectableChatMessage(chat)) continue;

    if (chat.role === "user") {
      result.push({
        id: chat.id,
        role: "user",
        content: chat.content,
        timestamp: chat.createdAt,
      });
      continue;
    }

    const toolCalls = chat.toolCalls ?? [];
    const modelToolCalls: ToolCall[] = toolCalls.map((tc, index) =>
      toModelToolCall(tc, chat.id, index),
    );

    result.push({
      id: chat.id,
      role: "assistant",
      content: chat.content,
      timestamp: chat.createdAt,
      toolCalls: modelToolCalls.length > 0 ? modelToolCalls : undefined,
    });

    for (let i = 0; i < toolCalls.length; i++) {
      const tc = toolCalls[i];
      const callId = modelToolCalls[i]?.id;
      const body =
        tc.output !== undefined
          ? stringifyToolPayload(tc.output)
          : (tc.error ?? (tc.status === "executing" ? "工具执行中" : ""));
      result.push({
        id: chat.id,
        role: "tool",
        content: body,
        toolCallId: callId,
        name: tc.toolName,
        timestamp: chat.createdAt,
      });
    }
  }

  return result;
}

function toModelToolCall(tc: ToolCallRecord, chatId: string, index: number): ToolCall {
  return {
    id: tc.callId && tc.callId.length > 0 ? tc.callId : `call_${chatId}_${index}`,
    type: "function",
    function: {
      name: tc.toolName,
      arguments: stringifyToolPayload(tc.input ?? {}),
    },
  };
}
