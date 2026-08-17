import { useEffect, useEffectEvent, useRef } from "react";

type UseForegroundRefreshOptions = {
  /** 默认 60_000 */
  intervalMs?: number;
  /** false 时不轮询（如 Modal 打开） */
  enabled?: boolean;
};

/**
 * 标签页可见时按间隔静默刷新；hidden 停止；回到前台立即补刷一次。
 */
export function useForegroundRefresh(
  callback: () => void | Promise<void>,
  options: UseForegroundRefreshOptions = {},
): void {
  const { intervalMs = 60_000, enabled = true } = options;
  const onTick = useEffectEvent(() => {
    void callback();
  });
  const wasHiddenRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let timer: number | null = null;

    function clear() {
      if (timer != null) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    function start() {
      clear();
      timer = window.setInterval(() => {
        if (document.visibilityState === "visible") onTick();
      }, intervalMs);
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") {
        wasHiddenRef.current = true;
        clear();
        return;
      }
      if (wasHiddenRef.current) {
        wasHiddenRef.current = false;
        onTick();
      }
      start();
    }

    if (document.visibilityState === "visible") {
      start();
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clear();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, intervalMs]);
}
