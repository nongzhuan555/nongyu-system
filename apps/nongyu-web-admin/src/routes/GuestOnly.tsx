import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { RouteLoading } from "../layouts/RouteLoading";
import { ROUTES } from "../lib/constants";
import { useAuthStore } from "../stores/authStore";

/**
 * 未登录可进登录页；已登录默认去工作台。
 * 例外：App handoff（loginType=in_app）仍进登录页，以便 WebView 注入 ticket 后完成兑换。
 */
export function GuestOnly({ children }: { children: ReactNode }) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (!isHydrated) {
    return <RouteLoading />;
  }

  if (isAuthenticated) {
    const params = new URLSearchParams(location.search);
    const isHandoff = params.get("loginType") === "in_app";
    if (!isHandoff) {
      return <Navigate replace to={ROUTES.workspace} />;
    }
  }

  return children;
}
