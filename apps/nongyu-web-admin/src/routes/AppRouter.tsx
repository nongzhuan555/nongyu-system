import { Navigate, Route, Routes } from "react-router-dom";
import { AdminShell } from "../layouts/AdminShell";
import { ROUTES } from "../lib/constants";
import { ContentPage } from "../pages/ContentPage";
import { DashboardPage } from "../pages/DashboardPage";
import { LlmKeysPage } from "../pages/LlmKeysPage";
import { LoginPage } from "../pages/LoginPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { UsersPage } from "../pages/UsersPage";
import { VersionsPage } from "../pages/VersionsPage";
import { WorkspacePage } from "../pages/WorkspacePage";
import { GuestOnly } from "./GuestOnly";
import { RequireAuth } from "./RequireAuth";

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
        element={
          <RequireAuth>
            <AdminShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate replace to={ROUTES.workspace} />} />
        <Route path={ROUTES.workspace} element={<WorkspacePage />} />
        <Route path={ROUTES.dashboard} element={<DashboardPage />} />
        <Route path={ROUTES.users} element={<UsersPage />} />
        <Route path={ROUTES.content} element={<ContentPage />} />
        <Route path={ROUTES.llmKeys} element={<LlmKeysPage />} />
        <Route path={ROUTES.versions} element={<VersionsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
