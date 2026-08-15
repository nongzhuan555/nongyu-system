/**
 * 智慧助手接入契约。
 * 后续可接 nongyu-agent-sdk / 问数工具；本刀仅占位，不引入模型运行时。
 */
export type AssistantMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

export type AssistantChatAdapter = {
  /** 发送用户消息；实现方可流式更新 UI */
  send: (text: string) => Promise<void> | void;
  getMessages?: () => AssistantMessage[];
};

export type AssistantPanelProps = {
  open: boolean;
  onClose: () => void;
  /** 未传则使用内置占位适配器 */
  adapter?: AssistantChatAdapter;
};
