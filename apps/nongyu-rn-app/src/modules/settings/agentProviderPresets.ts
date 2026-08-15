/**
 * OpenAI 兼容服务商预设：选中后自动填 Base URL + 默认模型名
 */

export type AgentProviderPreset = {
  id: string;
  label: string;
  /** null 表示自定义，需用户手填 */
  baseURL: string | null;
  /** 该服务商推荐的默认模型 */
  defaultModel: string;
  hint?: string;
};

export const AGENT_PROVIDER_PRESETS: AgentProviderPreset[] = [
  {
    id: "deepseek",
    label: "DeepSeek",
    baseURL: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    hint: "DeepSeek Chat / Reasoner 均可用此地址",
  },
  {
    id: "openai",
    label: "OpenAI",
    baseURL: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
  },
  {
    id: "qwen",
    label: "通义千问",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-plus",
    hint: "阿里云 DashScope OpenAI 兼容模式",
  },
  {
    id: "moonshot",
    label: "Kimi",
    baseURL: "https://api.moonshot.cn/v1",
    defaultModel: "moonshot-v1-8k",
  },
  {
    id: "zhipu",
    label: "智谱 GLM",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    defaultModel: "glm-4-flash",
  },
  {
    id: "siliconflow",
    label: "硅基流动",
    baseURL: "https://api.siliconflow.cn/v1",
    defaultModel: "deepseek-ai/DeepSeek-V3",
  },
  {
    id: "custom",
    label: "自定义",
    baseURL: null,
    defaultModel: "gpt-4o-mini",
    hint: "自行填写任意 OpenAI 兼容 Base URL 与模型名",
  },
];

export const CUSTOM_PROVIDER_ID = "custom";

/**
 * 按已存 baseURL 反推预设；匹配不上则视为自定义
 */
export function matchPresetByBaseURL(baseURL: string): AgentProviderPreset {
  const normalized = baseURL.trim().replace(/\/$/, "");
  const found = AGENT_PROVIDER_PRESETS.find(
    (p) => p.baseURL != null && p.baseURL.replace(/\/$/, "") === normalized,
  );
  return found ?? AGENT_PROVIDER_PRESETS.find((p) => p.id === CUSTOM_PROVIDER_ID)!;
}
