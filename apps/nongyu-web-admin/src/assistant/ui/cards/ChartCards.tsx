import type { EChartsOption } from "echarts";
import { Card, Skeleton, Table } from "antd";
import { EchartsBlock } from "../../../components/dashboard/EchartsBlock";
import type { ToolRenderProps } from "../registry";

type ChartOut = {
  chartType?: "line" | "bar" | "pie" | "table";
  title?: string;
  categories?: string[];
  series?: { name: string; data: number[] }[];
};

function toOption(out: ChartOut): EChartsOption | null {
  const categories = out.categories ?? [];
  const series = out.series ?? [];
  if (categories.length === 0 || series.length === 0) return null;
  if (out.chartType === "pie") {
    return {
      tooltip: { trigger: "item" },
      series: [
        {
          type: "pie",
          radius: "65%",
          data: categories.map((name, i) => ({ name, value: series[0]?.data[i] ?? 0 })),
        },
      ],
    };
  }
  return {
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: categories },
    yAxis: { type: "value" },
    series: series.map((s) => ({
      name: s.name,
      type: out.chartType === "bar" ? "bar" : "line",
      data: s.data,
      smooth: out.chartType !== "bar",
    })),
  };
}

export function AdminChartCard({ output, status, error }: ToolRenderProps) {
  if (status === "executing") return <Skeleton active paragraph={{ rows: 6 }} />;
  if (status === "error") return <p className="text-sm text-red-600">{error ?? "查询失败"}</p>;
  const out = (output ?? {}) as ChartOut;
  const option = toOption(out);
  if (!option) {
    return (
      <Card size="small" className="rounded-2xl" title={out.title ?? "数据"}>
        <p className="text-sm text-muted">暂无数据</p>
      </Card>
    );
  }
  return (
    <Card size="small" className="rounded-2xl" title={out.title}>
      <div className="h-52 w-full">
        <EchartsBlock option={option} />
      </div>
    </Card>
  );
}

export function AdminDataTableCard({ output, status, error }: ToolRenderProps) {
  if (status === "executing") return <Skeleton active paragraph={{ rows: 4 }} />;
  if (status === "error") return <p className="text-sm text-red-600">{error ?? "查询失败"}</p>;
  const data = output as { columns?: string[]; rows?: Record<string, unknown>[]; total?: number };
  const columns = (data?.columns ?? []).map((key) => ({ title: key, dataIndex: key, key }));
  const rows = (data?.rows ?? []).map((row, i) => ({ key: i, ...row }));
  return (
    <Card
      size="small"
      className="rounded-2xl"
      title={data?.total != null ? `共 ${data.total} 条` : "明细"}
    >
      <Table
        size="small"
        pagination={false}
        columns={columns}
        dataSource={rows}
        scroll={{ x: 480 }}
      />
    </Card>
  );
}
