import type { ChatMessage, ToolCallRecord } from "nongyu-agent-sdk";

/** 平台 LLM 代理业务失败码（与 Node ErrorCodes 对齐） */
export const PLATFORM_LLM_FAIL_CODES = new Set([
  50210, // LLM_UPSTREAM_FAILED
  50310, // LLM_POOL_UNAVAILABLE
  50311, // LLM_POOL_BUSY
  42910, // LLM_USER_DAILY_LIMIT
  42911, // LLM_USER_BUSY
]);

export const PLATFORM_LLM_BUSY_REPLY =
  "农屿后台使用的是智谱的免费模型，排队时间较长且服务不稳定，若您追求快速响应和稳定功能，请自行配置大模型的API Key";

/** 仅用于 A2UI 展示的伪工具名，不得进入模型上下文 */
export const PLATFORM_LLM_BUSY_NAV_TOOL = "platform_llm_busy_nav";

const UI_ONLY_TOOL_NAMES = new Set([PLATFORM_LLM_BUSY_NAV_TOOL]);

export function isPlatformLlmPoolBusyError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  for (const code of PLATFORM_LLM_FAIL_CODES) {
    if (msg.includes(String(code))) return true;
  }
  if (
    /LLM_POOL_BUSY|LLM_POOL_UNAVAILABLE|LLM_UPSTREAM_FAILED|LLM_USER_DAILY_LIMIT|LLM_USER_BUSY/i.test(
      msg,
    )
  ) {
    return true;
  }
  const jsonMatch = msg.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return false;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as { code?: number };
    return typeof parsed?.code === "number" && PLATFORM_LLM_FAIL_CODES.has(parsed.code);
  } catch {
    return false;
  }
}

export function buildPlatformBusyNavToolCall(): ToolCallRecord {
  return {
    callId: `ui_platform_busy_${Date.now()}`,
    toolName: PLATFORM_LLM_BUSY_NAV_TOOL,
    input: {},
    output: { ok: true },
    status: "done",
  };
}

/** 剥离仅 UI 用的伪 toolCall，避免下一轮发给模型未知工具 */
export function stripUiOnlyToolCalls(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) => {
    if (!m.toolCalls?.length) return m;
    const toolCalls = m.toolCalls.filter((tc) => !UI_ONLY_TOOL_NAMES.has(tc.toolName));
    if (toolCalls.length === m.toolCalls.length) return m;
    return { ...m, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
  });
}
