import type { ComponentType } from "react";

export interface ToolRenderProps<Args = unknown, Out = unknown> {
  callId?: string;
  args: Args;
  output: Out | undefined;
  status: "executing" | "done" | "error";
  error?: string;
  onAction?: (text: string) => void;
}

export type ToolRenderer = ComponentType<ToolRenderProps>;

const renderers = new Map<string, ToolRenderer>();

export function registerToolUI(toolName: string, renderer: ToolRenderer): void {
  renderers.set(toolName, renderer);
}

export function getToolUI(toolName: string): ToolRenderer | undefined {
  return renderers.get(toolName);
}
