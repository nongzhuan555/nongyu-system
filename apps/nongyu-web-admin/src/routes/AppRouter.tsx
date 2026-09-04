import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { RouteLoading } from "../layouts/RouteLoading";
import { ROUTES } from "../lib/constants";
import { LoginPage } from "../pages/LoginPage";
import { GuestOnly } from "./GuestOnly";
import { RequireAuth } from "./RequireAuth";

/** 仅已登录后加载；勿再对内部页面二级拆包 */
const AuthedApp = lazy(() => import("./AuthedApp").then((m) => ({ default: m.AuthedApp })));

export function AppRouter() {
  return (
    <Routes>
      <Route
        path={ROUTES.login}
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <Suspense fallback={<RouteLoading />}>
              <AuthedApp />
            </Suspense>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
