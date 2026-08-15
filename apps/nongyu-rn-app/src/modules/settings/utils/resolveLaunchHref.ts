import type { Href } from "expo-router";
import { useAppLaunchPrefsStore } from "../store/appLaunchPrefsStore";

/**
 * 进入主栈时的默认 Tab 路径（读当前偏好）
 */
export function resolveLaunchHref(): Href {
  const tab = useAppLaunchPrefsStore.getState().launchTab;
  return tab === "course" ? "/(tabs)/course" : "/(tabs)/home";
}
