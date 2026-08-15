import { useEffect } from "react";
import { loadCredentials, loadSecondPassword } from "@/storage/secureCredentials";
import {
  bridgeSetSecondLoginData,
  restoreSecondTokenFromStorage,
} from "@/modules/second/auth/secondSession";
import { refreshSecondAuthFlag } from "@/modules/second/hooks/useSecondAuth";

/**
 * 冷启动恢复二课 token / 登录凭据到工具内存（不阻塞农屿会话 hydrate）
 */
export function useSecondBootstrap() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      restoreSecondTokenFromStorage();
      const creds = await loadCredentials();
      const secondPassword = await loadSecondPassword();
      if (cancelled) return;

      if (creds && secondPassword) {
        bridgeSetSecondLoginData(creds.studentId, secondPassword);
      }
      refreshSecondAuthFlag();
    })();

    return () => {
      cancelled = true;
    };
  }, []);
}
