import { Card, Skeleton, Statistic } from "antd";
import type { ToolRenderProps } from "../registry";

export function AdminKpiGroupCard({ output, status, error }: ToolRenderProps) {
  if (status === "executing") return <Skeleton active paragraph={{ rows: 2 }} />;
  if (status === "error") return <p className="text-sm text-red-600">{error ?? "查询失败"}</p>;
  const data = output as { items?: { label: string; value: number }[]; date?: string } | undefined;
  const items = data?.items ?? [];
  return (
    <Card size="small" className="rounded-2xl" title={data?.date ? `概览 ${data.date}` : "概览"}>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <Statistic key={item.label} title={item.label} value={item.value} />
        ))}
      </div>
    </Card>
  );
}
