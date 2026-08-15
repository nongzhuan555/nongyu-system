import { enqueue, flushPending } from "./client";

type GlobalErrorUtils = {
  getGlobalHandler?: () => ((error: Error, isFatal?: boolean) => void) | undefined;
  setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

let installed = false;

/**
 * 安装一次全局 JS 异常采集；保留原 handler，避免打断 RN 红屏
 */
export function installCrashTracking(): void {
  if (installed) return;
  installed = true;

  const errorUtils = (globalThis as { ErrorUtils?: GlobalErrorUtils }).ErrorUtils;
  if (!errorUtils?.setGlobalHandler) return;

  const previous = errorUtils.getGlobalHandler?.();
  errorUtils.setGlobalHandler((error, isFatal) => {
    try {
      enqueue({
        event_type: "crash",
        event_name: isFatal ? "fatal" : "js",
        props: {
          message: String(error?.message ?? error),
          stack: typeof error?.stack === "string" ? error.stack.slice(0, 2048) : undefined,
        },
      });
      void flushPending();
    } catch {
      // 采集失败不得再抛，否则死循环
    }
    previous?.(error, isFatal);
  });
}
