import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { RouteLoading } from "../layouts/RouteLoading";
import { ROUTES } from "../lib/constants";
import { useAuthStore } from "../stores/authStore";

/**
 * 未登录可进登录页；已登录默认去工作台。
 * 例外：App handoff（loginType=in_app + ticket）仍进登录页以完成自动兑换。
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
    const ticket = params.get("ticket")?.trim();
    const isHandoff = params.get("loginType") === "in_app" && Boolean(ticket);
    if (!isHandoff) {
      return <Navigate replace to={ROUTES.workspace} />;
    }
  }

  return children;
}
