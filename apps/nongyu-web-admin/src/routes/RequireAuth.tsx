import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { RouteLoading } from "../layouts/RouteLoading";
import { ROUTES } from "../lib/constants";
import { useAuthStore } from "../stores/authStore";

export function RequireAuth({ children }: { children: ReactNode }) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (!isHydrated) {
    return <RouteLoading />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        replace
        to={ROUTES.login}
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return children;
}
