import { Card, Descriptions, Skeleton, Table, Tag } from "antd";
import type { ToolRenderProps } from "../registry";

export function AdminUserListCard({ output, status, error }: ToolRenderProps) {
  if (status === "executing") return <Skeleton active paragraph={{ rows: 4 }} />;
  if (status === "error") return <p className="text-sm text-red-600">{error ?? "查询失败"}</p>;
  const data = output as { list?: Array<Record<string, unknown>>; total?: number } | undefined;
  const list = data?.list ?? [];
  return (
    <Card size="small" className="rounded-2xl" title={`用户 ${data?.total ?? list.length} 人`}>
      <Table
        size="small"
        pagination={false}
        rowKey={(row) => String(row.id)}
        dataSource={list}
        scroll={{ x: 480 }}
        columns={[
          { title: "学号", dataIndex: "studentNo", width: 110 },
          { title: "姓名", dataIndex: "name", width: 80 },
          { title: "学院", dataIndex: "college" },
          {
            title: "角色",
            dataIndex: "role",
            width: 80,
            render: (role: number) => (role === 1 ? <Tag color="green">管理员</Tag> : "用户"),
          },
        ]}
      />
    </Card>
  );
}

export function AdminUserDetailCard({ output, status, error }: ToolRenderProps) {
  if (status === "executing") return <Skeleton active paragraph={{ rows: 6 }} />;
  if (status === "error") return <p className="text-sm text-red-600">{error ?? "查询失败"}</p>;
  const u = output as Record<string, unknown> | undefined;
  if (!u) return null;
  return (
    <Card size="small" className="rounded-2xl" title={String(u.name ?? "用户详情")}>
      <Descriptions column={1} size="small">
        <Descriptions.Item label="学号">{String(u.studentNo ?? "")}</Descriptions.Item>
        <Descriptions.Item label="学院">{String(u.college ?? "—")}</Descriptions.Item>
        <Descriptions.Item label="年级">{String(u.grade ?? "—")}</Descriptions.Item>
        <Descriptions.Item label="角色">{u.role === 1 ? "管理员" : "用户"}</Descriptions.Item>
        <Descriptions.Item label="状态">{u.status === 1 ? "正常" : "禁用"}</Descriptions.Item>
        <Descriptions.Item label="在线">{u.isOnline ? "是" : "否"}</Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
