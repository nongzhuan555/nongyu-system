import { Suspense, lazy, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AdminShell } from "../layouts/AdminShell";
import { RouteLoading } from "../layouts/RouteLoading";
import { ROUTES } from "../lib/constants";
import { LoginPage } from "../pages/LoginPage";
import { GuestOnly } from "./GuestOnly";
import { RequireAuth } from "./RequireAuth";

/** 业务页按路由拆包；登录页保留静态以缩短未登录首屏 */
const WorkspacePage = lazy(() =>
  import("../pages/WorkspacePage").then((m) => ({ default: m.WorkspacePage })),
);
const DashboardPage = lazy(() =>
  import("../pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const UsersPage = lazy(() => import("../pages/UsersPage").then((m) => ({ default: m.UsersPage })));
const ContentPage = lazy(() =>
  import("../pages/ContentPage").then((m) => ({ default: m.ContentPage })),
);
const HomeGreetingsPage = lazy(() =>
  import("../pages/HomeGreetingsPage").then((m) => ({ default: m.HomeGreetingsPage })),
);
const AgentChatSuggestionsPage = lazy(() =>
  import("../pages/AgentChatSuggestionsPage").then((m) => ({
    default: m.AgentChatSuggestionsPage,
  })),
);
const LlmKeysPage = lazy(() =>
  import("../pages/LlmKeysPage").then((m) => ({ default: m.LlmKeysPage })),
);
const RelatedSitesPage = lazy(() =>
  import("../pages/RelatedSitesPage").then((m) => ({ default: m.RelatedSitesPage })),
);
const NotFoundPage = lazy(() =>
  import("../pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })),
);

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteLoading />}>{children}</Suspense>;
}

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
        <Route
          path={ROUTES.workspace}
          element={
            <LazyPage>
              <WorkspacePage />
            </LazyPage>
          }
        />
        <Route
          path={ROUTES.dashboard}
          element={
            <LazyPage>
              <DashboardPage />
            </LazyPage>
          }
        />
        <Route
          path={ROUTES.users}
          element={
            <LazyPage>
              <UsersPage />
            </LazyPage>
          }
        />
        <Route
          path={ROUTES.content}
          element={
            <LazyPage>
              <ContentPage />
            </LazyPage>
          }
        />
        <Route
          path={ROUTES.homeGreetings}
          element={
            <LazyPage>
              <HomeGreetingsPage />
            </LazyPage>
          }
        />
        <Route
          path={ROUTES.agentChatSuggestions}
          element={
            <LazyPage>
              <AgentChatSuggestionsPage />
            </LazyPage>
          }
        />
        <Route
          path={ROUTES.llmKeys}
          element={
            <LazyPage>
              <LlmKeysPage />
            </LazyPage>
          }
        />
        <Route
          path={ROUTES.relatedSites}
          element={
            <LazyPage>
              <RelatedSitesPage />
            </LazyPage>
          }
        />
        <Route path="/versions" element={<Navigate replace to={ROUTES.relatedSites} />} />
        <Route
          path="*"
          element={
            <LazyPage>
              <NotFoundPage />
            </LazyPage>
          }
        />
      </Route>
    </Routes>
  );
}
