import { Redirect } from "expo-router";

/**
 * Tab 组默认入口：无业务页，仅重定向到 home（对齐 src/modules/home）
 * Expo Router 要求存在 index，否则打开 `/` 会 Unmatched Route
 */
export default function TabsIndex() {
  return <Redirect href="/(tabs)/home" />;
}
