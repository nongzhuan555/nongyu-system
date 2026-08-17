import type { EChartsOption } from "echarts";
import type { DistKeyCount, TrackDimItem, UserGrowth } from "../../types/dashboard";
import { formatRnRouteLabel } from "../../lib/rnRouteLabels";

export const CHART_COLORS = ["#0A7C59", "#2E7D6E", "#8FBF9B", "#D4E9DF", "#5A9A86", "#A8C9B8"];

const TOOLTIP = {
  backgroundColor: "rgba(255,255,255,0.92)",
  borderColor: "#CFE3DA",
  borderRadius: 12,
  extraCssText: "backdrop-filter:blur(10px);box-shadow:0 12px 32px -20px rgb(15 23 42 / 0.25);",
  textStyle: { color: "#1F2937" },
};

const GENDER_LABEL: Record<string, string> = {
  male: "男",
  female: "女",
  unknown: "未知",
};

export function labelDistKey(key: string): string {
  if (key === "true") return "是";
  if (key === "false") return "否";
  return GENDER_LABEL[key] ?? (key === "unknown" || key === "" ? "未知" : key);
}

function emptyGuard(count: number): boolean {
  return count === 0;
}

export function pieOption(rows: DistKeyCount[]): EChartsOption | null {
  if (emptyGuard(rows.length)) return null;
  return {
    color: CHART_COLORS,
    tooltip: { ...TOOLTIP, trigger: "item" },
    series: [
      {
        type: "pie",
        radius: ["46%", "72%"],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 8, borderColor: "#fff", borderWidth: 2 },
        label: { color: "#424945", fontSize: 11 },
        data: rows.map((row) => ({ name: labelDistKey(row.key), value: row.count })),
      },
    ],
  };
}

export function barOption(rows: DistKeyCount[], horizontal = false): EChartsOption | null {
  if (rows.length === 0) return null;
  const names = rows.map((row) => labelDistKey(row.key));
  const values = rows.map((row) => row.count);
  return {
    color: CHART_COLORS,
    tooltip: { ...TOOLTIP, trigger: "axis" },
    grid: { left: horizontal ? 88 : 24, right: 16, top: 16, bottom: 32, containLabel: !horizontal },
    xAxis: horizontal
      ? {
          type: "value",
          axisLabel: { color: "#424945" },
          splitLine: { lineStyle: { color: "#F1F5F9" } },
        }
      : {
          type: "category",
          data: names,
          axisLabel: { color: "#424945", rotate: names.length > 6 ? 30 : 0 },
        },
    yAxis: horizontal
      ? {
          type: "category",
          data: names,
          axisLabel: { color: "#424945", width: 80, overflow: "truncate" },
        }
      : {
          type: "value",
          axisLabel: { color: "#424945" },
          splitLine: { lineStyle: { color: "#F1F5F9" } },
        },
    series: [
      {
        type: "bar",
        data: values,
        barMaxWidth: 28,
        itemStyle: { borderRadius: horizontal ? [0, 8, 8, 0] : [8, 8, 0, 0] },
      },
    ],
  };
}

/** 页面使用次数：类目为 RN 路由展示名 */
export function dimBarOption(items: TrackDimItem[]): EChartsOption | null {
  if (items.length === 0) return null;
  const names = items.map((item) => formatRnRouteLabel(item.dimValue));
  const values = items.map((item) => item.metricValue);
  return {
    color: CHART_COLORS,
    tooltip: { ...TOOLTIP, trigger: "axis" },
    grid: { left: 120, right: 16, top: 16, bottom: 32, containLabel: true },
    xAxis: {
      type: "value",
      axisLabel: { color: "#424945" },
      splitLine: { lineStyle: { color: "#F1F5F9" } },
    },
    yAxis: {
      type: "category",
      data: names,
      axisLabel: { color: "#424945", width: 110, overflow: "truncate" },
    },
    series: [
      {
        type: "bar",
        data: values,
        barMaxWidth: 28,
        itemStyle: { borderRadius: [0, 8, 8, 0] },
      },
    ],
  };
}

/** 按钮点击分布：类目为稳定 event_name，不做路由映射 */
export function buttonClicksBarOption(items: TrackDimItem[]): EChartsOption | null {
  if (items.length === 0) return null;
  const names = items.map((item) => item.dimValue);
  const values = items.map((item) => item.metricValue);
  return {
    color: CHART_COLORS,
    tooltip: { ...TOOLTIP, trigger: "axis" },
    grid: { left: 140, right: 16, top: 16, bottom: 32, containLabel: true },
    xAxis: {
      type: "value",
      axisLabel: { color: "#424945" },
      splitLine: { lineStyle: { color: "#F1F5F9" } },
    },
    yAxis: {
      type: "category",
      data: names,
      axisLabel: { color: "#424945", width: 130, overflow: "truncate" },
    },
    series: [
      {
        type: "bar",
        data: values,
        barMaxWidth: 28,
        itemStyle: { borderRadius: [0, 8, 8, 0] },
      },
    ],
  };
}

/**
 * 页均停留：metric_value 为 ms，展示为秒（1 位小数）
 */
export function dwellBarOption(items: TrackDimItem[]): EChartsOption | null {
  if (items.length === 0) return null;
  const names = items.map((item) => formatRnRouteLabel(item.dimValue));
  const values = items.map((item) => Math.round((item.metricValue / 1000) * 10) / 10);
  return {
    color: CHART_COLORS,
    tooltip: {
      ...TOOLTIP,
      trigger: "axis",
      valueFormatter: (value) => `平均停留 ${String(value)}s`,
    },
    grid: { left: 120, right: 16, top: 16, bottom: 32, containLabel: true },
    xAxis: {
      type: "value",
      name: "秒",
      axisLabel: { color: "#424945" },
      splitLine: { lineStyle: { color: "#F1F5F9" } },
    },
    yAxis: {
      type: "category",
      data: names,
      axisLabel: { color: "#424945", width: 110, overflow: "truncate" },
    },
    series: [
      {
        type: "bar",
        data: values,
        barMaxWidth: 28,
        itemStyle: { borderRadius: [0, 8, 8, 0] },
      },
    ],
  };
}

export function growthOption(growth: UserGrowth): EChartsOption | null {
  if (growth.points.length === 0) return null;
  return {
    color: CHART_COLORS,
    tooltip: { ...TOOLTIP, trigger: "axis" },
    grid: { left: 16, right: 16, top: 24, bottom: 24, containLabel: true },
    xAxis: {
      type: "category",
      data: growth.points.map((p) => p.date.slice(5)),
      axisLabel: { color: "#424945" },
      boundaryGap: false,
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLabel: { color: "#424945" },
      splitLine: { lineStyle: { color: "#F1F5F9" } },
    },
    series: [
      {
        type: "line",
        smooth: true,
        data: growth.points.map((p) => p.newUsers),
        areaStyle: { color: "rgba(16,185,129,0.12)" },
        symbol: "circle",
        symbolSize: 6,
      },
    ],
  };
}

export function perfOption(p50: TrackDimItem[], p95: TrackDimItem[]): EChartsOption | null {
  const names = [...new Set([...p50, ...p95].map((item) => item.dimValue))].slice(0, 20);
  if (names.length === 0) return null;
  const p50Map = new Map(p50.map((item) => [item.dimValue, item.metricValue]));
  const p95Map = new Map(p95.map((item) => [item.dimValue, item.metricValue]));
  return {
    color: CHART_COLORS,
    tooltip: { ...TOOLTIP, trigger: "axis" },
    legend: { data: ["p50", "p95"], bottom: 0, textStyle: { color: "#424945" } },
    grid: { left: 16, right: 16, top: 16, bottom: 36, containLabel: true },
    xAxis: {
      type: "category",
      data: names,
      axisLabel: { color: "#424945", rotate: 20, width: 80, overflow: "truncate" },
    },
    yAxis: {
      type: "value",
      name: "ms",
      axisLabel: { color: "#424945" },
      splitLine: { lineStyle: { color: "#F1F5F9" } },
    },
    series: [
      {
        name: "p50",
        type: "bar",
        data: names.map((name) => p50Map.get(name) ?? 0),
        barMaxWidth: 18,
        itemStyle: { borderRadius: [8, 8, 0, 0] },
      },
      {
        name: "p95",
        type: "bar",
        data: names.map((name) => p95Map.get(name) ?? 0),
        barMaxWidth: 18,
        itemStyle: { borderRadius: [8, 8, 0, 0] },
      },
    ],
  };
}
