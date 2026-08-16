import { router, type Href } from "expo-router";
import { attachSecondAuthRefreshHooks } from "nongyu-tool-second";
import { toast } from "@/components/ui/toast";
import { clearSecondToolSession } from "@/modules/second/auth/secondSession";
import { refreshSecondAuthFlag } from "@/modules/second/hooks/useSecondAuth";
import { setSecondAccessToken } from "@/storage/mmkv";
import { clearSecondPassword } from "@/storage/secureCredentials";

let attached = false;

/**
 * 注册二课自动重登副作用：MMKV 持久化 + Toast / 失败跳登录（幂等）
 */
export function setupSecondAuthRefreshBridge(): void {
  if (attached) return;
  attached = true;

  attachSecondAuthRefreshHooks({
    onRefreshStart: () => {
      toast.info("二课登录过期，正在自动重新登录…");
    },
    onTokenRefreshed: (token) => {
      setSecondAccessToken(token);
      refreshSecondAuthFlag();
    },
    onRefreshFailed: (error) => {
      void (async () => {
        clearSecondToolSession();
        await clearSecondPassword();
        refreshSecondAuthFlag();
        toast.error("自动重新登录失败，请手动登录", {
          description: error.message || "本地二课密码可能已失效",
        });
        router.push("/home/second/login" as Href);
      })();
    },
  });
}
