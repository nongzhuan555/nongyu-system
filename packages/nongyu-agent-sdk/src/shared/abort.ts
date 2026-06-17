/**
 * AbortSignal 工具函数
 */

/** 创建一个支持外部手动 abort 的 AbortSignal */
export function createAbortSignal(timeoutMs?: number): {
  signal: AbortSignal;
  abort: () => void;
} {
  const controller = new AbortController();

  if (timeoutMs) {
    setTimeout(() => controller.abort(), timeoutMs);
  }

  return {
    signal: controller.signal,
    abort: () => controller.abort(),
  };
}

/** 将多个 AbortSignal 合并为一个（任一触发则触发） */
export function combineAbortSignals(
  ...signals: (AbortSignal | undefined)[]
): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (!signal) continue;
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason));
  }

  return controller.signal;
}
