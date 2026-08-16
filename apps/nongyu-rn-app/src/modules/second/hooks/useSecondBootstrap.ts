import { useEffect } from "react";
import { loadCredentials, loadSecondPassword } from "@/storage/secureCredentials";
import {
  bridgeSetSecondLoginData,
  restoreSecondTokenFromStorage,
} from "@/modules/second/auth/secondSession";
import { setupSecondAuthRefreshBridge } from "@/modules/second/auth/setupSecondAuthRefreshBridge";
import { refreshSecondAuthFlag } from "@/modules/second/hooks/useSecondAuth";
import { useSessionStore } from "@/stores/session";

/**
 * 冷启动恢复二课 token / 登录凭据到工具内存（等农屿会话 hydrate 后再写 LOGIN_DATA）
 */
export function useSecondBootstrap() {
  const hydrated = useSessionStore((s) => s.hydrated);
  const profileStudentId = useSessionStore((s) => s.profile?.studentId);

  useEffect(() => {
    setupSecondAuthRefreshBridge();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    (async () => {
      restoreSecondTokenFromStorage();
      const [creds, secondPassword] = await Promise.all([loadCredentials(), loadSecondPassword()]);
      if (cancelled) return;

      const studentId = (creds?.studentId || profileStudentId || "").trim();
      if (studentId && secondPassword) {
        // 首次登录写入的二课密码 + 学号，供 token 过期时无感重登
        bridgeSetSecondLoginData(studentId, secondPassword);
      }
      refreshSecondAuthFlag();
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, profileStudentId]);
}
