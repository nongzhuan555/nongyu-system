import { type ReactNode, useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { resolveLaunchHref } from "@/modules/settings/utils/resolveLaunchHref";
import { useSessionStore } from "@/stores/session";

/**
 * 会话门禁：hydrate 前挡住界面；未登录只允许停在登录页，已登录离开登录页。
 */
export function AuthRoot({ children }: { children: ReactNode }) {
  const hydrated = useSessionStore((state) => state.hydrated);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;

    const onLogin = segments[0] === "login";
    if (!isAuthenticated && !onLogin) {
      router.replace("/login");
      return;
    }
    if (isAuthenticated && onLogin) {
      router.replace(resolveLaunchHref());
      return;
    }
    void SplashScreen.hideAsync();
  }, [hydrated, isAuthenticated, segments, router]);

  if (!hydrated) return null;
  return children;
}
