import { Alert, Button, Input, Pagination, Select, Spin, Table, Tag } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { useEffect, useEffectEvent, useState } from "react";
import { PageFrame } from "../components/layout/PageFrame";
import { UserDetailDrawer } from "../components/users/UserDetailDrawer";
import { useForegroundRefresh } from "../hooks/useForegroundRefresh";
import { AdminApiError, listAdminUsers } from "../lib/adminApi";
import { DEFAULT_USER_PAGE_SIZE, FOREGROUND_REFRESH_INTERVAL_MS } from "../lib/constants";
import { displayText, formatAdminDateTime } from "../lib/format";
import { useIsLg } from "../lib/responsive";
import { useAuthStore } from "../stores/authStore";
import type { AdminUserListItem, UserRole, UserStatus } from "../types/users";

type RoleFilter = "all" | UserRole;
type StatusFilter = "all" | UserStatus;
type OnlineFilter = "all" | 1;
type ActiveTodayFilter = "all" | 1;

function RoleTag({ role }: { role: UserRole }) {
  if (role === 2) return <Tag color="purple">超级管理员</Tag>;
  if (role === 1) return <Tag color="success">管理员</Tag>;
  return <Tag>普通用户</Tag>;
}

function StatusTag({ status }: { status: UserStatus }) {
  return status === 1 ? <Tag color="success">正常</Tag> : <Tag color="warning">禁用</Tag>;
}

export function UsersPage() {
  const isLg = useIsLg();
  const currentUserId = useAuthStore((state) => state.user?.id ?? null);
  const canManageRole = useAuthStore((state) => state.user?.role === 2);

  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [online, setOnline] = useState<OnlineFilter>("all");
  const [activeToday, setActiveToday] = useState<ActiveTodayFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_USER_PAGE_SIZE);

  const [list, setList] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const loadList = useEffectEvent(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await listAdminUsers({
        page,
        pageSize,
        keyword: keyword.trim() || undefined,
        role: role === "all" ? undefined : role,
        status: status === "all" ? undefined : status,
        isOnline: online === 1 ? 1 : undefined,
        activeToday: activeToday === 1 ? 1 : undefined,
      });
      setList(data.list);
      setTotal(data.total);
      if (silent) setError(null);
    } catch (err) {
      if (silent) return;
      setList([]);
      setTotal(0);
      if (err instanceof AdminApiError) {
        setError(
          err.code === 40302
            ? "当前会话无权管理用户，请先在农屿 App 使用该学号登录完成建档。"
            : err.serverMessage,
        );
      } else {
        setError("网络异常，请稍后重试");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  });

  useEffect(() => {
    void loadList();
  }, [page, pageSize, keyword, role, status, online, activeToday]);

  useForegroundRefresh(() => void loadList(true), {
    intervalMs: FOREGROUND_REFRESH_INTERVAL_MS,
    enabled: !drawerOpen,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setKeyword((prev) => {
        if (prev === keywordInput) return prev;
        setPage(1);
        return keywordInput;
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [keywordInput]);

  const columns: ColumnsType<AdminUserListItem> = [
    { title: "学号", dataIndex: "studentNo", width: 120, fixed: "left" },
    { title: "姓名", dataIndex: "name", width: 100, fixed: "left" },
    {
      title: "学院",
      dataIndex: "college",
      width: 140,
      responsive: ["md"],
      render: (value: string | null) => displayText(value),
    },
    {
      title: "年级",
      dataIndex: "grade",
      width: 90,
      responsive: ["lg"],
      render: (value: string | null) => displayText(value),
    },
    {
      title: "角色",
      dataIndex: "role",
      width: 100,
      render: (value: UserRole) => <RoleTag role={value} />,
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 90,
      render: (value: UserStatus) => <StatusTag status={value} />,
    },
    {
      title: "在线",
      dataIndex: "isOnline",
      width: 80,
      responsive: ["md"],
      render: (value: boolean) => (value ? "在线" : "离线"),
    },
    {
      title: "最近登录",
      dataIndex: "lastLoginAt",
      width: 160,
      responsive: ["lg"],
      render: (value: string | null) => formatAdminDateTime(value),
    },
    {
      title: "注册时间",
      dataIndex: "createdAt",
      width: 160,
      responsive: ["xl"],
      render: (value: string) => formatAdminDateTime(value),
    },
  ];

  function openUser(id: number) {
    setSelectedId(id);
    setDrawerOpen(true);
  }

  function handleTableChange(pagination: TablePaginationConfig) {
    setPage(pagination.current ?? 1);
    setPageSize(pagination.pageSize ?? DEFAULT_USER_PAGE_SIZE);
  }

  const filterBar = (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <Input
        allowClear
        className="w-full sm:w-56"
        placeholder="搜索学号 / 姓名"
        value={keywordInput}
        onChange={(event) => setKeywordInput(event.target.value)}
      />
      <Select<RoleFilter>
        className="w-full sm:w-32"
        value={role}
        onChange={(value) => {
          setRole(value);
          setPage(1);
        }}
        options={[
          { value: "all", label: "全部角色" },
          { value: 0, label: "普通用户" },
          { value: 1, label: "管理员" },
          { value: 2, label: "超级管理员" },
        ]}
      />
      <Select<StatusFilter>
        className="w-full sm:w-32"
        value={status}
        onChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        options={[
          { value: "all", label: "全部状态" },
          { value: 1, label: "正常" },
          { value: 0, label: "禁用" },
        ]}
      />
      <Select<OnlineFilter>
        className="w-full sm:w-36"
        value={online}
        onChange={(value) => {
          setOnline(value);
          setPage(1);
        }}
        options={[
          { value: "all", label: "全部在线状态" },
          { value: 1, label: "仅当前在线" },
        ]}
      />
      <Select<ActiveTodayFilter>
        className="w-full sm:w-36"
        value={activeToday}
        onChange={(value) => {
          setActiveToday(value);
          setPage(1);
        }}
        options={[
          { value: "all", label: "全部活跃状态" },
          { value: 1, label: "仅今日活跃" },
        ]}
      />
    </div>
  );

  return (
    <PageFrame
      title="用户管理"
      description="查看用户档案，调整角色与账号状态。「仅今日活跃」按最近活跃时间近似统计，不等同大屏日活。"
      toolbar={filterBar}
    >
      {error ? (
        <Alert
          className="mb-4"
          type="error"
          showIcon
          message={error}
          action={
            <Button
              size="small"
              onClick={() => {
                void loadList();
              }}
            >
              重试
            </Button>
          }
        />
      ) : null}

      {isLg ? (
        <Table<AdminUserListItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={list}
          size="middle"
          scroll={{ x: 900 }}
          locale={{ emptyText: "暂无用户" }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (count) => `共 ${count} 人`,
          }}
          onChange={handleTableChange}
          onRow={(record) => ({
            onClick: () => openUser(record.id),
            className: "cursor-pointer",
          })}
        />
      ) : (
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spin />
            </div>
          ) : null}
          {!loading && list.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">暂无用户</p>
          ) : null}
          {!loading
            ? list.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className="flex w-full flex-col gap-2 rounded-xl border border-line-soft bg-canvas px-4 py-3.5 text-left transition-colors active:bg-elev"
                  onClick={() => openUser(user.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-ink">{user.name}</p>
                      <p className="mt-0.5 truncate text-[13px] tabular-nums text-muted">
                        {user.studentNo}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1">
                      <RoleTag role={user.role} />
                      <StatusTag status={user.status} />
                    </div>
                  </div>
                  {user.college || user.isOnline ? (
                    <p className="truncate text-[12px] text-muted">
                      {[
                        user.college ? displayText(user.college) : null,
                        user.isOnline ? "在线" : "离线",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                </button>
              ))
            : null}
          {total > 0 ? (
            <div className="flex justify-center pt-2">
              <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                showSizeChanger
                size="small"
                onChange={(nextPage, nextSize) => {
                  setPage(nextPage);
                  setPageSize(nextSize);
                }}
              />
            </div>
          ) : null}
        </div>
      )}

      <UserDetailDrawer
        open={drawerOpen}
        userId={selectedId}
        currentUserId={currentUserId}
        canManageRole={canManageRole}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedId(null);
        }}
        onChanged={() => {
          void loadList();
        }}
      />
    </PageFrame>
  );
}
