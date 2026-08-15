import { OpenAIProvider } from "nongyu-agent-sdk";

export type ProbeAgentInput = {
  baseURL: string;
  apiKey: string;
  model: string;
};

export type ProbeAgentResult = { ok: true; reply: string } | { ok: false; reason: string };

const PROBE_TIMEOUT_MS = 25_000;
const PROBE_USER_MESSAGE = "你好";

/**
 * 保存前连通性检测：向所选模型发「你好」，校验是否得到合理 LLM 文本回复。
 */
export async function probeAgentConnectivity(input: ProbeAgentInput): Promise<ProbeAgentResult> {
  const baseURL = input.baseURL.trim().replace(/\/$/, "");
  const apiKey = input.apiKey.trim();
  const model = input.model.trim();

  if (!baseURL || !apiKey || !model) {
    return { ok: false, reason: "配置不完整" };
  }

  const provider = new OpenAIProvider({ baseURL, apiKey, model });

  try {
    const result = await Promise.race([
      provider.generateText({
        model,
        messages: [{ role: "user", content: PROBE_USER_MESSAGE }],
        temperature: 0.3,
        max_tokens: 64,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          const err = new Error("连接超时，请检查网络或 Base URL");
          err.name = "AbortError";
          reject(err);
        }, PROBE_TIMEOUT_MS);
      }),
    ]);

    const reply = (result.content ?? "").trim();
    const judgment = judgeLlmReply(reply);
    if (!judgment.ok) {
      return { ok: false, reason: judgment.reason };
    }
    return { ok: true, reply };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, reason: err.message || "连接超时，请检查网络或 Base URL" };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: shortenError(msg) };
  }
}

/**
 * 判断回复是否像合理有效的 LLM 文本（非空、非错误页、含可读字符）
 */
function judgeLlmReply(reply: string): { ok: true } | { ok: false; reason: string } {
  if (!reply) {
    return { ok: false, reason: "模型返回空内容" };
  }
  if (reply.length < 1) {
    return { ok: false, reason: "模型返回过短" };
  }
  // 拒绝明显的 HTML / 网关错误页
  if (/<!DOCTYPE|<html[\s>]|<\/html>/i.test(reply)) {
    return { ok: false, reason: "返回内容不像模型回复（疑似网页错误）" };
  }
  // 至少包含中日韩字符、字母或数字之一
  if (!/[\u4e00-\u9fffA-Za-z0-9]/.test(reply)) {
    return { ok: false, reason: "返回内容无法识别为有效文本" };
  }
  return { ok: true };
}

function shortenError(msg: string): string {
  const trimmed = msg.replace(/\s+/g, " ").trim();
  if (trimmed.length <= 160) return trimmed;
  return `${trimmed.slice(0, 157)}…`;
}
