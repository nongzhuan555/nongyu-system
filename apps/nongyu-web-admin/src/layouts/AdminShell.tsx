import {
  ApiOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  FileTextOutlined,
  GlobalOutlined,
  KeyOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  MessageOutlined,
  RobotOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Dropdown, Menu, Tooltip } from "antd";
import type { MenuProps } from "antd";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AssistantPanel } from "../assistant/AssistantPanel";
import { ChangePasswordModal } from "../components/ChangePasswordModal";
import { ResizeHandle } from "../components/ResizeHandle";
import {
  ROUTES,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_DEFAULT,
  SIDEBAR_WIDTH_MAX,
  SIDEBAR_WIDTH_MIN,
} from "../lib/constants";
import { useIsLg } from "../lib/responsive";
import {
  clampSidebarWidth,
  readShellLayout,
  writeShellLayout,
  type ShellLayoutPrefs,
} from "../lib/shellLayoutPrefs";
import { NongyuLogo } from "../components/brand/NongyuLogo";
import { useAuthStore } from "../stores/authStore";

const MENU_ITEMS: MenuProps["items"] = [
  { key: ROUTES.workspace, icon: <AppstoreOutlined />, label: "工作台" },
  { key: ROUTES.dashboard, icon: <BarChartOutlined />, label: "数据大屏" },
  { key: ROUTES.users, icon: <TeamOutlined />, label: "用户管理" },
  { key: ROUTES.content, icon: <FileTextOutlined />, label: "内容管理" },
  { key: ROUTES.homeGreetings, icon: <MessageOutlined />, label: "首页问候" },
  { key: ROUTES.agentChatSuggestions, icon: <RobotOutlined />, label: "AI 建议" },
  { key: ROUTES.llmKeys, icon: <ApiOutlined />, label: "LLM Key 池" },
  { key: ROUTES.relatedSites, icon: <GlobalOutlined />, label: "相关网站" },
];

const PAGE_TITLES: Record<string, string> = {
  [ROUTES.workspace]: "工作台",
  [ROUTES.dashboard]: "数据大屏",
  [ROUTES.users]: "用户管理",
  [ROUTES.content]: "内容管理",
  [ROUTES.homeGreetings]: "首页问候",
  [ROUTES.agentChatSuggestions]: "AI 建议",
  [ROUTES.llmKeys]: "LLM Key 池",
  [ROUTES.relatedSites]: "相关网站",
};

function SideMenu({
  selectedKey,
  onSelect,
  collapsed,
}: {
  selectedKey: string;
  onSelect: (key: string) => void;
  collapsed?: boolean;
}) {
  return (
    <Menu
      className="admin-side-menu border-none bg-transparent"
      mode="inline"
      inlineCollapsed={collapsed}
      selectedKeys={PAGE_TITLES[selectedKey] ? [selectedKey] : []}
      items={MENU_ITEMS}
      onClick={(info) => onSelect(info.key)}
    />
  );
}

function BrandBlock({ collapsed }: { collapsed?: boolean }) {
  if (collapsed) {
    return (
      <div className="flex flex-col items-center px-1 pb-4 pt-1">
        <NongyuLogo size={36} className="rounded-lg shadow-sm" />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 px-3 pb-5 pt-1">
      <NongyuLogo size={44} className="shrink-0 shadow-sm" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">Nongyu</p>
        <p className="mt-0.5 text-[17px] font-semibold leading-6 tracking-tight text-ink">管理台</p>
      </div>
    </div>
  );
}

export function AdminShell() {
  const isLg = useIsLg();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [layout, setLayout] = useState<ShellLayoutPrefs>(() => readShellLayout());
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const userName = user?.name ?? "管理员";
  const isBootstrap = user?.bootstrap === true;
  const logout = useAuthStore((state) => state.logout);
  const pageTitle = PAGE_TITLES[location.pathname] ?? "农屿管理台";

  const sidebarCollapsed = layout.sidebarCollapsed;
  const sidebarWidth = sidebarCollapsed
    ? SIDEBAR_WIDTH_COLLAPSED
    : clampSidebarWidth(layout.sidebarWidth);

  /** 窄屏打开侧栏/助手时锁住背后滚动，避免手势冲突 */
  useEffect(() => {
    if (isLg) return;
    const shouldLock = isDrawerOpen || assistantOpen;
    if (!shouldLock) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isLg, isDrawerOpen, assistantOpen]);

  function persistLayout(next: ShellLayoutPrefs) {
    setLayout(next);
    writeShellLayout(next);
  }

  function handleSelect(key: string) {
    navigate(key);
    setIsDrawerOpen(false);
  }

  async function handleLogout() {
    await logout();
    navigate(ROUTES.login, { replace: true });
  }

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
    <div className="min-h-screen min-h-[100dvh] overflow-x-hidden bg-canvas">
      {isLg ? (
        <aside
          className="fixed bottom-0 left-0 top-0 z-20 flex flex-col border-r border-line-soft bg-surface pt-[env(safe-area-inset-top)]"
          style={{ width: sidebarWidth }}
        >
          <div className="relative flex min-h-0 flex-1 flex-col px-2 py-4">
            <BrandBlock collapsed={sidebarCollapsed} />
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              <SideMenu
                selectedKey={location.pathname}
                onSelect={handleSelect}
                collapsed={sidebarCollapsed}
              />
            </div>
            <button
              type="button"
              className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-line-soft bg-surface text-sm text-ink transition-colors hover:bg-elev"
              aria-label={sidebarCollapsed ? "展开侧栏" : "收起侧栏"}
              onClick={() => persistLayout({ ...layout, sidebarCollapsed: !sidebarCollapsed })}
            >
              {sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              {sidebarCollapsed ? null : <span>收起</span>}
            </button>
            {!sidebarCollapsed ? (
              <ResizeHandle
                edge="right"
                value={layout.sidebarWidth}
                min={SIDEBAR_WIDTH_MIN}
                max={SIDEBAR_WIDTH_MAX}
                defaultValue={SIDEBAR_WIDTH_DEFAULT}
                onChange={(next) =>
                  persistLayout({ ...layout, sidebarWidth: clampSidebarWidth(next) })
                }
              />
            ) : null}
          </div>
        </aside>
      ) : null}

      {!isLg && isDrawerOpen ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]"
            aria-label="关闭菜单"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="absolute bottom-0 left-0 top-0 flex w-[min(280px,86vw)] flex-col border-r border-line-soft bg-surface px-2 pb-[env(safe-area-inset-bottom)] pt-[max(1rem,env(safe-area-inset-top))] shadow-panel">
            <BrandBlock />
            <div className="min-h-0 flex-1 overflow-y-auto">
              <SideMenu selectedKey={location.pathname} onSelect={handleSelect} />
            </div>
          </div>
        </div>
      ) : null}

      <div
        className="flex min-h-screen min-h-[100dvh] min-w-0 flex-col"
        style={isLg ? { marginLeft: sidebarWidth } : undefined}
      >
        <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-3 border-b border-line-soft bg-surface/90 px-4 pb-0 pt-[env(safe-area-inset-top)] backdrop-blur-md md:px-6">
          <div className="flex h-14 min-w-0 items-center gap-2.5">
            {isLg ? null : (
              <button
                type="button"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line-soft bg-surface text-ink transition-colors hover:bg-elev active:bg-elev"
                aria-label="打开菜单"
                onClick={() => setIsDrawerOpen(true)}
              >
                <MenuOutlined />
              </button>
            )}
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold leading-5 text-ink">{pageTitle}</p>
            </div>
          </div>

          <div className="flex h-14 items-center gap-2">
            <button
              type="button"
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-ink transition-colors active:bg-elev ${
                assistantOpen
                  ? "border-brand bg-brand-muted text-brand"
                  : "border-line-soft bg-surface hover:bg-elev"
              }`}
              aria-label={assistantOpen ? "关闭智慧助手" : "打开智慧助手"}
              onClick={() => setAssistantOpen((prev) => !prev)}
            >
              <RobotOutlined />
            </button>

            <Dropdown trigger={["click"]} menu={{ items: userMenuItems }}>
              <button
                type="button"
                className="inline-flex h-11 max-w-[9.5rem] items-center gap-2 rounded-xl border border-line-soft bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-elev active:bg-elev sm:max-w-none"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-muted text-[11px] font-semibold text-brand">
                  {userName.slice(0, 1)}
                </span>
                <span className="truncate">{userName}</span>
                {isBootstrap ? (
                  <span className="hidden text-xs font-normal text-muted sm:inline">未建档</span>
                ) : null}
              </button>
            </Dropdown>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:px-6 md:py-6">
          {isBootstrap ? (
            <div className="mb-4 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-[13px] leading-5 text-amber-950">
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
