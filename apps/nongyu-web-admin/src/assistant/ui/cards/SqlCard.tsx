import type { EChartsOption } from "echarts";
import { Card, Collapse, Skeleton, Table } from "antd";
import { EchartsBlock } from "../../../components/dashboard/EchartsBlock";
import { getSqlRows } from "../../tools/sqlResultStore";
import type { ToolRenderProps } from "../registry";

type SqlOut = {
  sql?: string;
  columns?: string[];
  preview?: Record<string, unknown>[];
  chartType?: "line" | "bar" | "pie" | "table";
  uiId?: string;
  truncated?: boolean;
  rowCount?: number;
};

function numeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value)))
    return Number(value);
  return null;
}

function sqlToOption(
  columns: string[],
  rows: Record<string, unknown>[],
  chartType: SqlOut["chartType"],
): EChartsOption | null {
  if (columns.length < 2 || rows.length === 0) return null;
  const catCol = columns[0]!;
  const valCol = columns.find((c) => c !== catCol && rows.some((r) => numeric(r[c]) != null));
  if (!valCol) return null;
  const categories = rows.map((r) => String(r[catCol] ?? ""));
  const data = rows.map((r) => numeric(r[valCol]) ?? 0);
  if (chartType === "pie") {
    return {
      tooltip: { trigger: "item" },
      series: [
        {
          type: "pie",
          radius: "65%",
          data: categories.map((name, i) => ({ name, value: data[i] })),
        },
      ],
    };
  }
  if (chartType === "table") return null;
  return {
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: categories },
    yAxis: { type: "value" },
    series: [{ type: chartType === "bar" ? "bar" : "line", data, smooth: chartType !== "bar" }],
  };
}

export function AdminSqlBlockCard({ output, status, error }: ToolRenderProps) {
  if (status === "executing") return <Skeleton active paragraph={{ rows: 5 }} />;
  if (status === "error") return <p className="text-sm text-red-600">{error ?? "SQL 执行失败"}</p>;
  const out = (output ?? {}) as SqlOut;
  const rows = (out.uiId ? getSqlRows(out.uiId) : undefined) ?? out.preview ?? [];
  const columns = out.columns ?? [];
  const option = sqlToOption(columns, rows, out.chartType);
  const tableCols = columns.map((key) => ({ title: key, dataIndex: key, key }));
  return (
    <div className="flex flex-col gap-2">
      <Collapse
        size="small"
        items={[
          {
            key: "sql",
            label: "已执行 SQL",
            children: <pre className="max-h-40 overflow-auto text-xs">{out.sql}</pre>,
          },
        ]}
      />
      {out.truncated ? <p className="text-xs text-muted">结果已截断，仅展示部分行</p> : null}
      {option ? (
        <Card size="small" className="rounded-2xl">
          <div className="h-52 w-full">
            <EchartsBlock option={option} />
          </div>
        </Card>
      ) : (
        <Table
          size="small"
          pagination={false}
          columns={tableCols}
          dataSource={rows.map((row, i) => ({ key: i, ...row }))}
          scroll={{ x: 480 }}
        />
      )}
    </div>
  );
}
