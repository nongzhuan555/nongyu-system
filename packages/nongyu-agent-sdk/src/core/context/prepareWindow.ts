import type { Message } from "../../types/message";
import type { ModelProvider } from "../../types/model";
import type { ContextCompactPayload } from "../../types/context";
import { TrimmingStrategy } from "./strategies/trimming";
import {
  CHARS_PER_TOKEN_ESTIMATE,
  DEFAULT_COMPACT_THRESHOLD,
  DEFAULT_KEEP_LAST_N_TURNS,
  DEFAULT_MAX_TOKENS,
  SUMMARY_MAX_TOKENS,
  SUMMARY_TIMEOUT_MS,
} from "./defaults";

const SUMMARY_SYSTEM =
  "你是对话摘要器。请用中文概括此前对话：用户意图与约束、已确认事实（成绩/课表/活动等）、未完成事项。不要复述超长工具 JSON，不要编造未出现的信息。只输出摘要正文。";

export type PrepareWindowInput = {
  history: Message[];
  prompt: string;
  llmSummary?: string;
  llmCompactedUntilId?: string;
  lastPromptTokens?: number;
  model: ModelProvider;
  maxTokens?: number;
  keepLastNTurns?: number;
  compactThreshold?: number;
  abortSignal?: AbortSignal;
};

export type PreparedWindow = {
  /** 不含主 systemPrompt；含可选摘要 system + 近轮 + 本句 user */
  messages: Message[];
  summary?: string;
  compact?: ContextCompactPayload;
};

/**
 * 按游标切掉已压缩前缀，保留其后全部消息。
 */
export function sliceAfterCompactedId(messages: Message[], untilId?: string): Message[] {
  if (!untilId) return [...messages];
  let last = -1;
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].id === untilId) last = i;
  }
  if (last < 0) return [...messages];
  return messages.slice(last + 1);
}

/**
 * 粗估 token（无 tokenizer）。
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
}

function transcriptSize(messages: Message[], summary?: string): number {
  let chars = summary?.length ?? 0;
  for (const m of messages) {
    chars += m.content.length;
    if (m.toolCalls) {
      for (const tc of m.toolCalls) {
        chars += tc.function.name.length + (tc.function.arguments?.length ?? 0);
      }
    }
  }
  return Math.ceil(chars / CHARS_PER_TOKEN_ESTIMATE);
}

function countUserTurns(messages: Message[]): number {
  let n = 0;
  for (const m of messages) {
    if (m.role === "user") n++;
  }
  return n;
}

function formatTranscript(messages: Message[]): string {
  const lines: string[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      lines.push(`用户: ${m.content}`);
    } else if (m.role === "assistant") {
      const tools = m.toolCalls?.map((tc) => tc.function.name).join(", ");
      lines.push(`助手: ${m.content}${tools ? ` [工具: ${tools}]` : ""}`);
    } else if (m.role === "tool") {
      const body = m.content.length > 800 ? `${m.content.slice(0, 800)}…` : m.content;
      lines.push(`工具(${m.name ?? ""}): ${body}`);
    }
  }
  return lines.join("\n");
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("摘要超时")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function generateSummary(
  model: ModelProvider,
  prevSummary: string | undefined,
  oldMessages: Message[],
  abortSignal?: AbortSignal,
): Promise<string> {
  if (abortSignal?.aborted) throw new Error("摘要已取消");

  const userParts: string[] = [];
  if (prevSummary?.trim()) {
    userParts.push(`已有摘要：\n${prevSummary.trim()}`);
  }
  userParts.push(`被裁剪的旧对话：\n${formatTranscript(oldMessages)}`);

  const result = await withTimeout(
    model.generateText({
      model: model.model,
      messages: [
        { role: "system", content: SUMMARY_SYSTEM },
        { role: "user", content: userParts.join("\n\n") },
      ],
      temperature: 0.2,
      max_tokens: SUMMARY_MAX_TOKENS,
    }),
    SUMMARY_TIMEOUT_MS,
  );

  const text = result.content?.trim() ?? "";
  if (!text) throw new Error("摘要为空");
  return text;
}

function makeUserMessage(prompt: string): Message {
  return {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    role: "user",
    content: prompt,
    timestamp: Date.now(),
  };
}

function summaryAsMessage(summary: string): Message {
  return {
    id: "llm_summary",
    role: "system",
    content: `此前对话摘要：\n${summary}`,
    timestamp: Date.now(),
  };
}

/**
 * 组本回合模型窗口：切片 → 必要时 hybrid 压缩 → 追加当前 user。
 * 压缩只应在每回合第一次模型调用前执行。
 */
export async function prepareConversationWindow(
  input: PrepareWindowInput,
): Promise<PreparedWindow> {
  const maxTokens = input.maxTokens ?? DEFAULT_MAX_TOKENS;
  const keepLastNTurns = input.keepLastNTurns ?? DEFAULT_KEEP_LAST_N_TURNS;
  const compactThreshold = input.compactThreshold ?? DEFAULT_COMPACT_THRESHOLD;
  const thresholdTokens = maxTokens * compactThreshold;

  const window = sliceAfterCompactedId(input.history, input.llmCompactedUntilId);
  const userMsg = makeUserMessage(input.prompt);
  const estimated = transcriptSize(window, input.llmSummary) + estimateTokens(input.prompt);
  const lastTokens = input.lastPromptTokens ?? 0;
  const overBudget = estimated >= thresholdTokens || lastTokens >= thresholdTokens;
  const canTrim = countUserTurns(window) > keepLastNTurns;

  if (!overBudget || !canTrim) {
    const messages: Message[] = [];
    if (input.llmSummary?.trim()) messages.push(summaryAsMessage(input.llmSummary.trim()));
    messages.push(...window, userMsg);
    return { messages, summary: input.llmSummary };
  }

  const trimmer = new TrimmingStrategy(keepLastNTurns);
  const split = await trimmer.apply({ role: "system", content: "" }, window, input.llmSummary);
  const tail = split.messages;
  const cutCount = window.length - tail.length;
  const old = cutCount > 0 ? window.slice(0, cutCount) : [];
  const compactedUntilId = old.length > 0 ? old[old.length - 1].id : input.llmCompactedUntilId;
  const beforeTokens = estimated;

  let summary: string | undefined;
  let ok = false;
  try {
    if (old.length > 0) {
      summary = await generateSummary(input.model, input.llmSummary, old, input.abortSignal);
      ok = true;
    } else {
      summary = input.llmSummary;
      ok = true;
    }
  } catch {
    summary = undefined;
    ok = false;
  }

  const afterMessages: Message[] = [];
  if (summary?.trim()) afterMessages.push(summaryAsMessage(summary.trim()));
  afterMessages.push(...tail, userMsg);
  const afterTokens = transcriptSize(tail, summary) + estimateTokens(input.prompt);

  return {
    messages: afterMessages,
    summary,
    compact: {
      ok,
      beforeTokens,
      afterTokens,
      llmSummary: summary,
      llmCompactedUntilId: compactedUntilId,
    },
  };
}
