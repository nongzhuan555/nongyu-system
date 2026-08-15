import { Redirect } from "expo-router";
import { resolveLaunchHref } from "@/modules/settings/utils/resolveLaunchHref";

/**
 * Tab 组默认入口：无业务页，仅重定向到启动偏好 Tab
 * Expo Router 要求存在 index，否则打开 `/` 会 Unmatched Route
 */
export default function TabsIndex() {
  return <Redirect href={resolveLaunchHref()} />;
}
