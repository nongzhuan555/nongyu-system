import type { ToolCallRecord } from "nongyu-agent-sdk";
import { getToolUI } from "./registry";

export function ToolCallView({
  tc,
  onAction,
}: {
  tc: ToolCallRecord;
  onAction?: (text: string) => void;
}) {
  const Renderer = getToolUI(tc.toolName);
  if (!Renderer) {
    return (
      <div className="rounded-full bg-canvas px-3 py-1 text-xs text-muted">
        {tc.toolName}
        {tc.status === "executing" ? " …" : ""}
      </div>
    );
  }
  return (
    <Renderer
      callId={tc.callId}
      args={tc.input}
      output={tc.output}
      status={tc.status ?? "executing"}
      error={tc.error}
      onAction={onAction}
    />
  );
}
