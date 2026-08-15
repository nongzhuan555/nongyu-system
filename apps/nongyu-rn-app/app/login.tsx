import { Redirect } from "expo-router";
import { LoginScreen } from "@/modules/auth/screens/LoginScreen";
import { resolveLaunchHref } from "@/modules/settings/utils/resolveLaunchHref";
import { useSessionStore } from "@/stores/session";

/**
 * 全局登录路由。已登录则按启动页偏好进入主 Tab；未登录主路径由 AuthRoot 直接渲染登录页。
 */
export default function LoginRoute() {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  if (isAuthenticated) {
    return <Redirect href={resolveLaunchHref()} />;
  }
  return <LoginScreen />;
}
