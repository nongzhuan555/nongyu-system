import { crashPropsFromUnknown, reportCrash } from "./reportCrash";

type GlobalErrorUtils = {
  getGlobalHandler?: () => ((error: Error, isFatal?: boolean) => void) | undefined;
  setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

type HermesInternal = {
  hasPromise?: () => boolean;
  enablePromiseRejectionTracker?: (options: {
    allRejections?: boolean;
    onUnhandled?: (id: number, rejection?: unknown) => void;
    onHandled?: (id: number) => void;
  }) => void;
};

let installed = false;

/**
 * 安装一次：ErrorUtils 全局 JS + Hermes 未处理 Promise；保留原 handler
 */
export function installCrashTracking(): void {
  if (installed) return;
  installed = true;
  installErrorUtilsHandler();
  installPromiseRejectionTracker();
}

/**
 * 包住 RN ErrorUtils；fatal / js
 */
function installErrorUtilsHandler(): void {
  const errorUtils = (globalThis as { ErrorUtils?: GlobalErrorUtils }).ErrorUtils;
  if (!errorUtils?.setGlobalHandler) return;

  const previous = errorUtils.getGlobalHandler?.();
  errorUtils.setGlobalHandler((error, isFatal) => {
    try {
      const props = crashPropsFromUnknown(error);
      reportCrash(isFatal ? "fatal" : "js", props);
    } catch {
      // 采集失败不得再抛，否则死循环
    }
    previous?.(error, isFatal);
  });
}

/**
 * Hermes 未处理 Promise → unhandled_rejection（引擎全局仅一个 tracker）
 */
function installPromiseRejectionTracker(): void {
  const hermes = (globalThis as { HermesInternal?: HermesInternal }).HermesInternal;
  if (!hermes?.hasPromise?.() || !hermes.enablePromiseRejectionTracker) return;

  hermes.enablePromiseRejectionTracker({
    allRejections: true,
    onUnhandled: (_id, rejection) => {
      try {
        reportCrash("unhandled_rejection", crashPropsFromUnknown(rejection));
      } catch {
        // 采集失败不得再抛
      }
    },
    onHandled: () => {
      // 晚挂 .catch 的窗口接受引擎默认行为
    },
  });
}
