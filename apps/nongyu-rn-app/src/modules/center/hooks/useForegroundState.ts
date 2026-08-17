import { useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

/**
 * 通用前台检测 hook：返回当前 App 是否处于 active 状态。
 *
 * 用于轮询场景的前台 gate：后台时停止轮询，回前台自动恢复。
 * 复用既有 `AppState.addEventListener('change', ...)` 模式（参考 TelemetryHost / useCourseExt）。
 */
export function useForegroundState(): boolean {
  const [active, setActive] = useState(AppState.currentState === "active");

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      setActive(state === "active");
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, []);

  return active;
}
