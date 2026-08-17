import { enqueue, flushPending } from "./client";

const STACK_MAX = 2048;

/**
 * 统一 crash 入队并尽力 flush；采集失败吞掉，避免死循环
 */
export function reportCrash(eventName: string, props?: Record<string, unknown>): void {
  try {
    enqueue({
      event_type: "crash",
      event_name: eventName,
      props: truncateCrashProps(props),
    });
    void flushPending();
  } catch {
    // 采集失败不得再抛
  }
}

/**
 * 截断 stack / component_stack，控制体积
 */
function truncateCrashProps(
  props: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!props) return undefined;
  const out: Record<string, unknown> = { ...props };
  for (const key of ["stack", "component_stack"] as const) {
    const value = out[key];
    if (typeof value === "string" && value.length > STACK_MAX) {
      out[key] = value.slice(0, STACK_MAX);
    }
  }
  return out;
}

/**
 * 从 unknown rejection / error 抽出 message + stack
 */
export function crashPropsFromUnknown(error: unknown): {
  message: string;
  stack?: string;
} {
  if (error instanceof Error) {
    return {
      message: error.message || error.name || "Error",
      stack: typeof error.stack === "string" ? error.stack : undefined,
    };
  }
  if (typeof error === "string") {
    return { message: error };
  }
  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: String(error) };
  }
}
