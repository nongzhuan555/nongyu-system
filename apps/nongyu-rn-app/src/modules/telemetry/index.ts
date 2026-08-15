import { enqueue } from "./client";
import type { TrackEventInput } from "./types";

export { installCrashTracking } from "./crash";
export { TelemetryHost } from "./TelemetryHost";
export { flushPending, shutdownForLogout } from "./client";
export type { TrackEventInput, TrackEventType } from "./types";

/**
 * 通用入队；无 Token 时静默丢弃
 */
export function track(input: TrackEventInput): void {
  enqueue(input);
}

/**
 * 重点按钮点击
 */
export function trackClick(eventName: string, props?: Record<string, unknown>): void {
  enqueue({ event_type: "button_click", event_name: eventName, props });
}

/**
 * 同步性能段
 */
export function measure(eventName: string, fn: () => void, props?: Record<string, unknown>): void {
  const started = Date.now();
  try {
    fn();
  } finally {
    enqueue({
      event_type: "perf",
      event_name: eventName,
      duration_ms: Date.now() - started,
      props,
    });
  }
}

/**
 * 异步性能段，返回原 Promise 结果
 */
export async function measureAsync<T>(
  eventName: string,
  fn: () => Promise<T>,
  props?: Record<string, unknown>,
): Promise<T> {
  const started = Date.now();
  try {
    return await fn();
  } finally {
    enqueue({
      event_type: "perf",
      event_name: eventName,
      duration_ms: Date.now() - started,
      props,
    });
  }
}
