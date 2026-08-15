import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "./lib/constants";
import { setUnauthorizedHandler } from "./lib/unauthorizedHandler";
import { AppRouter } from "./routes/AppRouter";
import { useAuthStore } from "./stores/authStore";

export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const hydrate = useAuthStore((state) => state.hydrate);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      const { isHydrated } = useAuthStore.getState();
      clearAuth();
      if (!isHydrated) return;
      if (location.pathname === ROUTES.login) return;
      navigate(ROUTES.login, {
        replace: true,
        state: { from: `${location.pathname}${location.search}` },
      });
    });

    return () => {
      setUnauthorizedHandler(() => undefined);
    };
  }, [clearAuth, location.pathname, location.search, navigate]);

  return <AppRouter />;
}
