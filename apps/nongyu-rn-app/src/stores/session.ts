import { create } from "zustand";

export type ThemeMode = "sicauGreen" | "sakura" | "dark" | "system";

/** 本地会话中的学生档案摘要（对齐教务 PersonalInfo 可持久化字段） */
export type SessionProfile = {
  studentId: string;
  name: string;
  college?: string;
  major?: string;
  grade?: string;
  className?: string;
  gender?: string;
  campus?: string;
  /** 家庭通讯地址（教务 homeAddress） */
  hometown?: string;
  identity?: string;
  studentStatus?: string;
  enrollmentDate?: string;
  ethnicity?: string;
  politicalStatus?: string;
  phone?: string;
  examId?: string;
};

type SessionState = {
  /** 是否已完成教务校验并建立本地会话 */
  isAuthenticated: boolean;
  /** 冷启动 hydrate 是否完成 */
  hydrated: boolean;
  /** 农屿 App Token（Node 未接通时可为 null） */
  token: string | null;
  /** 学生档案摘要 */
  profile: SessionProfile | null;
  themeMode: ThemeMode;
  setAuthenticated: (value: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setHydrated: (value: boolean) => void;
  setSession: (payload: { profile: SessionProfile; token?: string | null }) => void;
  clearSession: () => void;
};

/**
 * 客户端会话与偏好状态（不承载服务端缓存）
 */
export const useSessionStore = create<SessionState>((set) => ({
  isAuthenticated: false,
  hydrated: false,
  token: null,
  profile: null,
  themeMode: "sicauGreen",
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setThemeMode: (mode) => set({ themeMode: mode }),
  setHydrated: (value) => set({ hydrated: value }),
  setSession: ({ profile, token = null }) =>
    set({
      isAuthenticated: true,
      profile,
      token: token ?? null,
    }),
  clearSession: () =>
    set({
      isAuthenticated: false,
      token: null,
      profile: null,
    }),
}));
