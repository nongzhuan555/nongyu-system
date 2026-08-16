import { type ReactNode, useEffect, useState } from "react";
import { useRouter, useSegments } from "expo-router";
import * as Linking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import { resolveLaunchHref } from "@/modules/settings/utils/resolveLaunchHref";
import {
  consumePendingCourseTab,
  isWidgetCourseLaunchUrl,
  markPendingCourseTabFromUrl,
  peekPendingCourseTab,
} from "@/modules/course/widget/widgetLaunch";
import { useSessionStore } from "@/stores/session";

/**
 * 会话门禁：hydrate 前挡住界面；未登录只允许停在登录页，已登录离开登录页。
 * 桌面小组件来源优先落到课表 Tab。
 */
export function AuthRoot({ children }: { children: ReactNode }) {
  const hydrated = useSessionStore((state) => state.hydrated);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const segments = useSegments();
  const router = useRouter();
  const [initialUrlReady, setInitialUrlReady] = useState(false);

  useEffect(() => {
    const sub = Linking.addEventListener("url", ({ url }) => {
      markPendingCourseTabFromUrl(url);
      if (useSessionStore.getState().isAuthenticated && isWidgetCourseLaunchUrl(url)) {
        consumePendingCourseTab();
        router.replace("/(tabs)/course");
      }
    });
    void Linking.getInitialURL()
      .then((url) => {
        markPendingCourseTabFromUrl(url);
      })
      .finally(() => {
        setInitialUrlReady(true);
      });
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    if (!hydrated || !initialUrlReady) return;

    const onLogin = segments[0] === "login";
    if (!isAuthenticated && !onLogin) {
      router.replace("/login");
      return;
    }
    if (isAuthenticated && onLogin) {
      const href = consumePendingCourseTab() ? "/(tabs)/course" : resolveLaunchHref();
      router.replace(href);
      void SplashScreen.hideAsync();
      return;
    }
    if (isAuthenticated && peekPendingCourseTab()) {
      consumePendingCourseTab();
      router.replace("/(tabs)/course");
      void SplashScreen.hideAsync();
      return;
    }
    void SplashScreen.hideAsync();
  }, [hydrated, initialUrlReady, isAuthenticated, segments, router]);

  if (!hydrated || !initialUrlReady) return null;
  return children;
}
