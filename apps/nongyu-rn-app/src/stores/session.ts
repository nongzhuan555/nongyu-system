import { create } from "zustand";

export type ThemeMode = "sicauGreen" | "sakura" | "dark" | "system";

type SessionState = {
  /** 是否已登录（骨架阶段仅占位） */
  isAuthenticated: boolean;
  themeMode: ThemeMode;
  setAuthenticated: (value: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
};

/**
 * 客户端会话与偏好状态（不承载服务端缓存）
 */
export const useSessionStore = create<SessionState>((set) => ({
  isAuthenticated: false,
  themeMode: "sicauGreen",
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setThemeMode: (mode) => set({ themeMode: mode }),
}));
