import { tool } from "nongyu-agent-sdk";
import { z } from "zod";
import {
  fetchTrackCrashes,
  fetchTrackDims,
  fetchTrackOverview,
  fetchTrackTrend,
} from "../../lib/adminApi";

export const adminTrackOverviewTool = tool({
  name: "admin_track_overview",
  description: "埋点日概览：DAU、崩溃、打开次数、页面浏览。问今天日活必须调用本工具，禁止 SQL。",
  inputSchema: z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
  render: { component: "AdminKpiGroup" },
  execute: async () => {
    const data = await fetchTrackOverview();
    return {
      items: [
        { label: "日活 DAU", value: data.dau },
        { label: "崩溃", value: data.crashCount },
        { label: "打开次数", value: data.appOpenCount },
        { label: "页面浏览", value: data.screenViewCount },
        ...(data.buttonClickCount != null
          ? [{ label: "按钮点击", value: data.buttonClickCount }]
          : []),
      ],
      date: data.date,
    };
  },
});

export const adminTrackTrendTool = tool({
  name: "admin_track_trend",
  description:
    "埋点趋势。metric: dau / crash_count / app_open_count / screen_view_count / online_peak。",
  inputSchema: z.object({
    metric: z.enum(["dau", "crash_count", "app_open_count", "screen_view_count", "online_peak"]),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  render: { component: "AdminChart" },
  execute: async (input) => {
    const data = await fetchTrackTrend(input.metric, input.from, input.to);
    return {
      chartType: "line" as const,
      title: `${input.metric} ${input.from}~${input.to}`,
      categories: data.points.map((p) => p.date),
      series: [{ name: input.metric, data: data.points.map((p) => p.value) }],
    };
  },
});

export const adminTrackDimsTool = tool({
  name: "admin_track_dims",
  description:
    "埋点维度分布。metric: screen_views / screen_dwell_avg / button_clicks / perf_p50 / perf_p95。",
  inputSchema: z.object({
    metric: z.enum(["screen_views", "screen_dwell_avg", "button_clicks", "perf_p50", "perf_p95"]),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
  render: { component: "AdminChart" },
  execute: async (input) => {
    const data = await fetchTrackDims(input.metric, input.date);
    return {
      chartType: "bar" as const,
      title: `${data.metric} ${data.date}`,
      categories: data.items.map((i) => i.dimValue || i.dimKey),
      series: [{ name: data.metric, data: data.items.map((i) => i.metricValue) }],
    };
  },
});

export const adminTrackCrashesTool = tool({
  name: "admin_track_crashes",
  description: "崩溃事件列表。问最近崩溃、JS 错误明细时调用。",
  inputSchema: z.object({
    page: z.number().int().min(1).optional(),
    pageSize: z.number().int().min(1).max(50).optional(),
  }),
  render: { component: "AdminDataTable" },
  execute: async (input) => {
    const data = await fetchTrackCrashes(input.page ?? 1, input.pageSize ?? 10);
    return {
      columns: ["eventId", "studentNo", "eventName", "appVersion", "platform", "statDate"],
      rows: data.list.map((row) => ({
        eventId: row.eventId,
        studentNo: row.studentNo,
        eventName: row.eventName,
        appVersion: row.appVersion,
        platform: row.platform,
        statDate: row.statDate,
      })),
      total: data.total,
    };
  },
});
