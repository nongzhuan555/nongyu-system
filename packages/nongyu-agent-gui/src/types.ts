import type { Tool } from "nongyu-agent-sdk";

/**
 * AgentChat 组件 Props
 */
export interface AgentChatProps {
  /** SDK 配置（model / tools / prompt），必填 */
  config: AgentChatConfig;

  /** 自定义样式类名 */
  className?: string;

  /** 聊天区域高度，默认 '100%'（父容器控制） */
  height?: string | number;

  /** 欢迎语，空状态时展示 */
  welcomeMessage?: string;

  /** 建议问题列表，空状态时展示 */
  suggestedQuestions?: string[];

  /** 工具调用回调 */
  onToolCall?: (toolName: string, input: unknown) => void;

  /** 错误回调 */
  onError?: (error: Error) => void;

  /** 开启调试模式，在控制台打印模型调用全流程信息 */
  debug?: boolean;
}

/**
 * AgentChat 配置（透传至 useAgentChat + createAgent）
 */
export interface AgentChatConfig {
  /** API Key */
  apiKey: string;
  /** API Base URL */
  baseURL: string;
  /** 模型名称 */
  model: string;
  /** 系统提示词 */
  systemPrompt: string;
  /** 工具集 */
  tools?: Record<string, Tool>;
  /** 模型温度 */
  temperature?: number;
  /** 最大步数 */
  maxSteps?: number;
}

/**
 * MarkdownRenderer Props
 */
export interface MarkdownRendererProps {
  /** Markdown 原始文本 */
  content: string;
  /** 是否正在进行流式渲染 */
  isStreaming?: boolean;
  /** A2UI 扩展：自定义组件注册表 */
  customComponents?: Record<string, React.ComponentType<any>>;
}
