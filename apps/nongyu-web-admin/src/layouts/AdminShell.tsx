import {
  ApiOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  CloudUploadOutlined,
  FileTextOutlined,
  KeyOutlined,
  LogoutOutlined,
  MenuOutlined,
  RobotOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Dropdown, Grid, Menu, Tooltip } from "antd";
import type { MenuProps } from "antd";
import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AssistantPanel } from "../assistant/AssistantPanel";
import { ChangePasswordModal } from "../components/ChangePasswordModal";
import { ROUTES } from "../lib/constants";
import { useAuthStore } from "../stores/authStore";

const MENU_ITEMS: MenuProps["items"] = [
  { key: ROUTES.workspace, icon: <AppstoreOutlined />, label: "工作台" },
  { key: ROUTES.dashboard, icon: <BarChartOutlined />, label: "数据大屏" },
  { key: ROUTES.users, icon: <TeamOutlined />, label: "用户管理" },
  { key: ROUTES.content, icon: <FileTextOutlined />, label: "内容管理" },
  { key: ROUTES.llmKeys, icon: <ApiOutlined />, label: "LLM Key 池" },
  { key: ROUTES.versions, icon: <CloudUploadOutlined />, label: "版本管理" },
];

const PAGE_TITLES: Record<string, string> = {
  [ROUTES.workspace]: "工作台",
  [ROUTES.dashboard]: "数据大屏",
  [ROUTES.users]: "用户管理",
  [ROUTES.content]: "内容管理",
  [ROUTES.llmKeys]: "LLM Key 池",
  [ROUTES.versions]: "版本管理",
};

function SideMenu({
  selectedKey,
  onSelect,
}: {
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <Menu
      className="border-none bg-transparent"
      mode="inline"
      selectedKeys={PAGE_TITLES[selectedKey] ? [selectedKey] : []}
      items={MENU_ITEMS}
      onClick={(info) => onSelect(info.key)}
    />
  );
}

export function AdminShell() {
  const screens = Grid.useBreakpoint();
  const isLg = screens.lg ?? true;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const userName = user?.name ?? "管理员";
  const isBootstrap = user?.bootstrap === true;
  const logout = useAuthStore((state) => state.logout);
  const pageTitle = PAGE_TITLES[location.pathname] ?? "农屿管理台";

  function handleSelect(key: string) {
    navigate(key);
    setIsDrawerOpen(false);
  }

  async function handleLogout() {
    await logout();
    navigate(ROUTES.login, { replace: true });
  }

  const brand = <p className="px-2 pb-4 text-lg font-semibold text-ink">农屿管理台</p>;

  const userMenuItems: MenuProps["items"] = [
    {
      key: "password",
      icon: <KeyOutlined />,
      label: isBootstrap ? (
        <Tooltip title="请先在农屿 App 使用该学号登录完成建档">
          <span>修改密码</span>
        </Tooltip>
      ) : (
        "修改密码"
      ),
      disabled: isBootstrap,
      onClick: () => {
        if (!isBootstrap) setPasswordOpen(true);
      },
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "登出",
      onClick: () => {
        void handleLogout();
      },
    },
  ];

  return (
    <div className="flex min-h-screen bg-canvas">
      {isLg ? (
        <aside className="m-4 w-60 shrink-0">
          <div className="flex h-[calc(100vh-2rem)] flex-col rounded-3xl border border-slate-200/70 bg-white p-4 shadow-card">
            {brand}
            <SideMenu selectedKey={location.pathname} onSelect={handleSelect} />
          </div>
        </aside>
      ) : null}

      {!isLg && isDrawerOpen ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/20"
            aria-label="关闭菜单"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="absolute bottom-4 left-4 top-4 w-64 rounded-3xl border border-slate-200/70 bg-white p-4 shadow-card">
            {brand}
            <SideMenu selectedKey={location.pathname} onSelect={handleSelect} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 px-4 py-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            {isLg ? null : (
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-card"
                aria-label="打开菜单"
                onClick={() => setIsDrawerOpen(true)}
              >
                <MenuOutlined />
              </button>
            )}
            <h1 className="truncate text-lg font-semibold text-ink">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-ink shadow-card"
              aria-label={assistantOpen ? "关闭智慧助手" : "打开智慧助手"}
              onClick={() => setAssistantOpen((prev) => !prev)}
            >
              <RobotOutlined />
            </button>

            <Dropdown trigger={["click"]} menu={{ items: userMenuItems }}>
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-2xl bg-white px-4 text-sm font-medium text-ink shadow-card"
              >
                {userName}
                {isBootstrap ? (
                  <span className="ml-2 text-xs font-normal text-slate-500">未建档</span>
                ) : null}
              </button>
            </Dropdown>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          {isBootstrap ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              当前为超级管理员引导会话：可浏览工作台，业务管理接口需先在农屿 App
              使用该学号登录完成建档。
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>

      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
      <AssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  );
}
