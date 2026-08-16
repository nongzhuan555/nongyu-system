import type { ToolCallRecord } from "../types/agent";

/**
 * 对话消息（前端 UI 层）
 *
 * 与 SDK 内部 Message 类型独立，新增 status 字段用于 UI 渲染控制
 * （骨架屏、打字动画、错误提示等）。
 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;

  /** 消息渲染状态（stopped = 用户主动打断，可含部分正文） */
  status?: "pending" | "streaming" | "done" | "error" | "stopped";

  /** 工具调用记录（仅 assistant 消息，流式过程中动态追加） */
  toolCalls?: ToolCallRecord[];

  /** 错误详情（status === 'error' 时） */
  error?: string;
}

/**
 * useAgentChat 配置
 */
export interface UseAgentChatConfig {
  /**
   * Agent 实例（必须已完成模型、工具、系统提示词配置）
   */
  agent: any; // Agent 类型通过 duck-typing 匹配，避免强依赖

  /** 初始消息列表 */
  initialMessages?: ChatMessage[];

  /** 发生错误时的回调 */
  onError?: (error: Error) => void;

  /** 工具调用发生时的回调（可用于 UI 通知） */
  onToolCall?: (info: { toolName: string; input: unknown }) => void;

  /** 开启调试模式，在控制台打印模型调用全流程信息 */
  debug?: boolean;

  /**
   * 文本流式更新节流间隔（毫秒）。
   *
   * 流式 `text:delta` 会高频触发 state 更新，长回复数百次渲染会导致卡顿。
   * 设置节流后，文本累积到 ref，按此间隔 flush 到 state，渲染次数大幅降低。
   * - 0（默认）：不节流，每个 delta 立即更新（保持旧行为）
   * - 推荐 React Native 设 40ms
   */
  textUpdateThrottleMs?: number;

  /** 已落盘的会话摘要，随每次请求注入 */
  llmSummary?: string;
  /** 压缩游标：该 UI 消息及之前不再注入模型 */
  llmCompactedUntilId?: string;
  /** 上下文压缩完成（成功或降级） */
  onContextCompact?: (payload: {
    ok: boolean;
    beforeTokens: number;
    afterTokens: number;
    llmSummary?: string;
    llmCompactedUntilId?: string;
  }) => void;
}

/**
 * useAgentChat 返回值
 */
export interface UseAgentChatReturn {
  /** 全部消息列表 */
  messages: ChatMessage[];

  /** 当前输入框内容 */
  input: string;
  /** 直接设置输入框内容 */
  setInput: (input: string) => void;

  /**
   * 输入变更处理（跨 React DOM / React Native）
   *
   * @example React DOM
   * <input onChange={handleInputChange} />
   *
   * @example React Native
   * <TextInput onChangeText={handleInputChange} />
   */
  handleInputChange: (e: { target: { value: string } } | string) => void;

  /** 提交当前 input，触发 AI 回复 */
  handleSubmit: (e?: { preventDefault?: () => void }) => Promise<void>;

  /** 直接追加消息并触发 AI 回复 */
  append: (message: { role: "user"; content: string }) => Promise<void>;

  /** 重新生成最后一条 AI 回复 */
  reload: () => Promise<void>;

  /** 停止当前生成 */
  stop: () => void;

  /** 是否正在生成回复 */
  isLoading: boolean;

  /** 最近一次错误 */
  error: Error | null;

  /** 清空所有消息 */
  clear: () => void;
}
