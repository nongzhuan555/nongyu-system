import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { RouteLoading } from "../layouts/RouteLoading";
import { ROUTES } from "../lib/constants";
import { useAuthStore } from "../stores/authStore";

export function GuestOnly({ children }: { children: ReactNode }) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isHydrated) {
    return <RouteLoading />;
  }

  if (isAuthenticated) {
    return <Navigate replace to={ROUTES.workspace} />;
  }

  return children;
}
