import { Alert, Button, Input, Select, Space, Table, Tag } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { useEffect, useEffectEvent, useState } from "react";
import { UserDetailDrawer } from "../components/users/UserDetailDrawer";
import { AdminApiError, listAdminUsers } from "../lib/adminApi";
import { DEFAULT_USER_PAGE_SIZE } from "../lib/constants";
import { displayText, formatAdminDateTime } from "../lib/format";
import { useAuthStore } from "../stores/authStore";
import type { AdminUserListItem, UserRole, UserStatus } from "../types/users";

type RoleFilter = "all" | UserRole;
type StatusFilter = "all" | UserStatus;

export function UsersPage() {
  const currentUserId = useAuthStore((state) => state.user?.id ?? null);

  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_USER_PAGE_SIZE);

  const [list, setList] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const loadList = useEffectEvent(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminUsers({
        page,
        pageSize,
        keyword: keyword.trim() || undefined,
        role: role === "all" ? undefined : role,
        status: status === "all" ? undefined : status,
      });
      setList(data.list);
      setTotal(data.total);
    } catch (err) {
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
      setLoading(false);
    }
  });

  useEffect(() => {
    void loadList();
  }, [page, pageSize, keyword, role, status]);

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
      title: "校区",
      dataIndex: "campus",
      width: 100,
      responsive: ["lg"],
      render: (value: string | null) => displayText(value),
    },
    {
      title: "角色",
      dataIndex: "role",
      width: 100,
      render: (value: UserRole) =>
        value === 1 ? <Tag color="success">管理员</Tag> : <Tag>普通用户</Tag>,
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 90,
      render: (value: UserStatus) =>
        value === 1 ? <Tag color="success">正常</Tag> : <Tag color="warning">禁用</Tag>,
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

  function handleTableChange(pagination: TablePaginationConfig) {
    setPage(pagination.current ?? 1);
    setPageSize(pagination.pageSize ?? DEFAULT_USER_PAGE_SIZE);
  }

  return (
    <div className="rounded-3xl bg-white p-4 shadow-card md:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">用户管理</h2>
          <p className="mt-1 text-sm text-muted">查看用户档案，调整角色与账号状态</p>
        </div>
        <Space wrap>
          <Input
            allowClear
            className="w-56"
            placeholder="搜索学号 / 姓名"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
          />
          <Select<RoleFilter>
            className="w-32"
            value={role}
            onChange={(value) => {
              setRole(value);
              setPage(1);
            }}
            options={[
              { value: "all", label: "全部角色" },
              { value: 0, label: "普通用户" },
              { value: 1, label: "管理员" },
            ]}
          />
          <Select<StatusFilter>
            className="w-32"
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
        </Space>
      </div>

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

      <Table<AdminUserListItem>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={list}
        scroll={{ x: 960 }}
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
          onClick: () => {
            setSelectedId(record.id);
            setDrawerOpen(true);
          },
          className: "cursor-pointer",
        })}
      />

      <UserDetailDrawer
        open={drawerOpen}
        userId={selectedId}
        currentUserId={currentUserId}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedId(null);
        }}
        onChanged={() => {
          void loadList();
        }}
      />
    </div>
  );
}
