import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useSessionStore } from "@/stores/session";
import { useCampusWeatherStore } from "./campusWeatherStore";

/** 前台天气刷新间隔 */
const FOREGROUND_REFRESH_MS = 5 * 60 * 1000;

/**
 * 校区天气调度：
 * - 进入 App / 回到前台：立即拉一次
 * - 前台每 5 分钟拉一次；进后台停止定时
 */
export function CampusWeatherBootstrapHost() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const hydrated = useSessionStore((s) => s.hydrated);
  const studentId = useSessionStore((s) => s.profile?.studentId);
  const refreshFromProfile = useCampusWeatherStore((s) => s.refreshFromProfile);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !studentId) return;

    let intervalId: ReturnType<typeof setInterval> | undefined;

    const pull = () => {
      const profile = useSessionStore.getState().profile;
      if (!profile) return;
      void refreshFromProfile(profile);
    };

    const clearTimer = () => {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const armTimer = () => {
      clearTimer();
      intervalId = setInterval(pull, FOREGROUND_REFRESH_MS);
    };

    const onActive = () => {
      pull();
      armTimer();
    };

    if (AppState.currentState === "active") {
      onActive();
    }

    const onChange = (next: AppStateStatus) => {
      if (next === "active") {
        onActive();
        return;
      }
      clearTimer();
    };

    const sub = AppState.addEventListener("change", onChange);
    return () => {
      clearTimer();
      sub.remove();
    };
  }, [hydrated, isAuthenticated, studentId, refreshFromProfile]);

  return null;
}
