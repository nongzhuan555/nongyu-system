import { message } from "antd";
import { create } from "zustand";
import { clearAssistantOnLogout } from "../assistant/logoutCleanup";
import { AdminApiError, fetchAdminMe, loginAdmin, logoutAdmin } from "../lib/adminApi";
import { AUTH_ERROR_CODES } from "../lib/constants";
import { clearSession, readSession, writeSession } from "../lib/storage";
import type { AdminUser, LoginType } from "../types/auth";

type AuthState = {
  token: string | null;
  user: AdminUser | null;
  isHydrated: boolean;
  isAuthenticated: boolean;
  hydrate: () => Promise<void>;
  login: (input: {
    studentNo: string;
    adminPassword: string;
    loginType: LoginType;
  }) => Promise<void>;
  logout: () => Promise<void>;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isHydrated: false,
  isAuthenticated: false,

  clearAuth: () => {
    clearSession();
    set({ token: null, user: null, isAuthenticated: false });
  },

  hydrate: async () => {
    const session = readSession();
    if (!session) {
      set({ token: null, user: null, isAuthenticated: false, isHydrated: true });
      return;
    }

    try {
      const user = await fetchAdminMe();
      writeSession({ token: session.token, user });
      set({ token: session.token, user, isAuthenticated: true, isHydrated: true });
    } catch {
      get().clearAuth();
      set({ isHydrated: true });
    }
  },

  login: async (input) => {
    const result = await loginAdmin(input);
    if (result.user.role !== 1) {
      throw new AdminApiError(AUTH_ERROR_CODES.ADMIN_REQUIRED, "需要管理员权限", 403);
    }
    writeSession({ token: result.token, user: result.user });
    set({
      token: result.token,
      user: result.user,
      isAuthenticated: true,
      isHydrated: true,
    });
  },

  logout: async () => {
    const adminUserId = get().user?.id;
    try {
      await logoutAdmin();
    } catch {
      // 服务端无黑名单，本地必须清掉
    } finally {
      clearAssistantOnLogout(adminUserId);
      get().clearAuth();
      message.info("对话记录与本地模型密钥已清除");
    }
  },
}));
