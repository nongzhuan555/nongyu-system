import { Navigate, Route, Routes } from "react-router-dom";
import { AdminShell } from "../layouts/AdminShell";
import { ROUTES } from "../lib/constants";
import { AgentChatSuggestionsPage } from "../pages/AgentChatSuggestionsPage";
import { ContentPage } from "../pages/ContentPage";
import { DashboardPage } from "../pages/DashboardPage";
import { HomeGreetingsPage } from "../pages/HomeGreetingsPage";
import { LlmKeysPage } from "../pages/LlmKeysPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { RelatedSitesPage } from "../pages/RelatedSitesPage";
import { UsersPage } from "../pages/UsersPage";
import { WorkspacePage } from "../pages/WorkspacePage";

/**
 * 已登录业务整包：与登录入口分离，避免把大屏/助手/echarts 打进首屏。
 * 内部不再对页面做二级 lazy，防止 Rolldown 产生「子 chunk → 父 chunk」循环依赖白屏。
 * 使用 default export，便于 `lazy(() => import("./AuthedApp"))` 直接对接。
 */
export default function AuthedApp() {
  return (
    <Routes>
      <Route element={<AdminShell />}>
        <Route path="/" element={<Navigate replace to={ROUTES.workspace} />} />
        <Route path={ROUTES.workspace} element={<WorkspacePage />} />
        <Route path={ROUTES.dashboard} element={<DashboardPage />} />
        <Route path={ROUTES.users} element={<UsersPage />} />
        <Route path={ROUTES.content} element={<ContentPage />} />
        <Route path={ROUTES.homeGreetings} element={<HomeGreetingsPage />} />
        <Route path={ROUTES.agentChatSuggestions} element={<AgentChatSuggestionsPage />} />
        <Route path={ROUTES.llmKeys} element={<LlmKeysPage />} />
        <Route path={ROUTES.relatedSites} element={<RelatedSitesPage />} />
        <Route path="/versions" element={<Navigate replace to={ROUTES.relatedSites} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
