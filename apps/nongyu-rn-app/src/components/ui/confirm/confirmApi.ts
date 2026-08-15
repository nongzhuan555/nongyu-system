import type { ConfirmOptions, ConfirmRequest } from "./types";

type Listener = (request: ConfirmRequest | null) => void;

let seq = 0;
let current: ConfirmRequest | null = null;
const listeners = new Set<Listener>();

/**
 * 通知 Host 刷新当前确认请求
 */
function emit() {
  for (const listener of listeners) {
    listener(current);
  }
}

/**
 * Host 订阅当前确认框
 */
export function subscribeConfirm(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * 关闭当前框并 resolve
 */
export function settleConfirm(value: boolean) {
  if (!current) return;
  const pending = current;
  current = null;
  emit();
  pending.resolve(value);
}

/**
 * 弹出全局确认框；确认 true，取消/蒙层/返回 false
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (current) {
      current.resolve(false);
    }
    seq += 1;
    current = {
      id: seq,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText?.trim() || "确定",
      cancelText: options.cancelText?.trim() || "取消",
      destructive: options.destructive === true,
      resolve,
    };
    emit();
  });
}
