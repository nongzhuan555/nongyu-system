import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { isAiTipMuted, setAiTipMuted } from "@/storage/mmkv";

const TIP_AUTO_HIDE_MS = 60 * 1000;
const TIP_INTERVAL_MS = 3 * 60 * 1000;

type UseAiTipBubbleResult = {
  visible: boolean;
  hideTip: () => void;
  /** 关闭并本地持久化「不再提醒」；登出后才会再提示 */
  muteTip: () => void;
};

/**
 * 农屿 AI 入口引导：进入主壳 / 回前台提示；前台每 3 分钟再提示
 * 「不再提醒」写入 MMKV；仅在 FloatingTabBar 挂载时生效
 */
export function useAiTipBubble(): UseAiTipBubbleResult {
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const mutedRef = useRef(isAiTipMuted());
  const autoHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const clearAutoHide = useCallback(() => {
    if (autoHideRef.current) {
      clearTimeout(autoHideRef.current);
      autoHideRef.current = null;
    }
  }, []);

  const clearIntervalTimer = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const hideTip = useCallback(() => {
    visibleRef.current = false;
    setVisible(false);
    clearAutoHide();
  }, [clearAutoHide]);

  const muteTip = useCallback(() => {
    mutedRef.current = true;
    setAiTipMuted(true);
    visibleRef.current = false;
    setVisible(false);
    clearAutoHide();
    clearIntervalTimer();
  }, [clearAutoHide, clearIntervalTimer]);

  const scheduleNextIntervalRef = useRef<() => void>(() => {});
  const showTipRef = useRef<() => void>(() => {});

  scheduleNextIntervalRef.current = () => {
    clearIntervalTimer();
    if (mutedRef.current) return;
    if (appStateRef.current !== "active") return;
    intervalRef.current = setTimeout(() => {
      if (appStateRef.current !== "active") return;
      showTipRef.current();
    }, TIP_INTERVAL_MS);
  };

  showTipRef.current = () => {
    if (mutedRef.current || isAiTipMuted()) {
      mutedRef.current = true;
      return;
    }
    if (appStateRef.current !== "active") return;
    visibleRef.current = true;
    setVisible(true);
    clearAutoHide();
    autoHideRef.current = setTimeout(() => {
      visibleRef.current = false;
      setVisible(false);
      autoHideRef.current = null;
    }, TIP_AUTO_HIDE_MS);
    // 每次成功展示后重置 3 分钟计时
    scheduleNextIntervalRef.current();
  };

  // 挂载 = 进入带底栏主壳（冷启动 / 登录落地 / 从 AI 返回）
  useEffect(() => {
    mutedRef.current = isAiTipMuted();
    showTipRef.current();
    return () => {
      clearAutoHide();
      clearIntervalTimer();
    };
  }, [clearAutoHide, clearIntervalTimer]);

  // 回前台再提示；进后台暂停 3 分钟计时
  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (prev.match(/inactive|background/) && next === "active") {
        mutedRef.current = isAiTipMuted();
        showTipRef.current();
        return;
      }
      if (next !== "active") {
        clearIntervalTimer();
      }
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [clearIntervalTimer]);

  return { visible, hideTip, muteTip };
}

export const AI_TIP_TEXT = "点击此处使用农屿AI功能";
export const AI_TIP_MUTE_LABEL = "不再提醒";
export const AI_TIP_DISMISS_LABEL = "我知道了";
