import type { ComponentType } from "react";

/**
 * 工具内联渲染组件的统一 Props 契约
 *
 * 由 nongyu-agent-sdk 的 ToolCallRecord 驱动：
 * - `args`：工具入参（来自 ToolCallRecord.input）
 * - `output`：工具执行结果（executing 时为 undefined）
 * - `status`：执行状态，用于三态渲染（骨架 / 数据 / 错误）
 * - `onAction`：事件回流，转成用户语义消息交给 Agent 决策（不直接执行副作用）
 */
export interface ToolRenderProps<Args = any, Out = any> {
  /** 工具调用唯一 id */
  callId?: string;
  /** 工具入参 */
  args: Args;
  /** 工具执行结果，executing 时为 undefined */
  output: Out | undefined;
  /** 执行状态 */
  status: "executing" | "done" | "error";
  /** 错误信息（status === 'error' 时） */
  error?: string;
  /**
   * 事件回流：把卡片内交互转成语义用户消息交给 Agent。
   * 例：`onAction?.("报名活动：校园歌手赛")` → useAgentChat.append
   */
  onAction?: (text: string) => void;
}

export type ToolRenderer<P = any> = ComponentType<ToolRenderProps<P>>;

const renderers = new Map<string, ToolRenderer>();

/**
 * 注册工具的内联渲染组件。
 * @param toolName 工具名（与 ToolDefinition.name 一致）
 * @param renderer 渲染组件
 */
export function registerToolUI(toolName: string, renderer: ToolRenderer): void {
  renderers.set(toolName, renderer);
}

/** 查询工具是否注册了内联渲染组件 */
export function hasToolUI(toolName: string): boolean {
  return renderers.has(toolName);
}

/** 获取工具的内联渲染组件；未注册返回 undefined */
export function getToolUI(toolName: string): ToolRenderer | undefined {
  return renderers.get(toolName);
}
