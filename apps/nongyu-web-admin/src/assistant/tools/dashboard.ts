import { tool } from "nongyu-agent-sdk";
import { z } from "zod";
import {
  fetchDashboardOverview,
  fetchSettingsDistribution,
  fetchUserDistribution,
  fetchUserGrowth,
} from "../../lib/adminApi";

export const adminDashboardOverviewTool = tool({
  name: "admin_dashboard_overview",
  description: "业务库概览：总用户、管理员数、当前在线、今日新增。问总人数/在线/今日新增时调用。",
  inputSchema: z.object({}),
  render: { component: "AdminKpiGroup" },
  execute: async () => {
    const data = await fetchDashboardOverview();
    return {
      items: [
        { label: "总用户", value: data.totalUsers },
        { label: "管理员", value: data.totalAdmins },
        { label: "当前在线", value: data.onlineUsers },
        { label: "今日新增", value: data.todayNewUsers },
      ],
    };
  },
});

export const adminUserGrowthTool = tool({
  name: "admin_user_growth",
  description: "新增用户趋势。问近几天注册/增长时调用，不要用 SQL。",
  inputSchema: z.object({
    range: z.enum(["7d", "30d", "90d", "180d", "365d"]).optional(),
  }),
  render: { component: "AdminChart" },
  execute: async (input) => {
    const range = input.range ?? "7d";
    const data = await fetchUserGrowth(range);
    return {
      chartType: "line" as const,
      title: `新增用户（${range}）`,
      categories: data.points.map((p) => p.date),
      series: [{ name: "新增", data: data.points.map((p) => p.newUsers) }],
    };
  },
});

export const adminUserDistributionTool = tool({
  name: "admin_user_distribution",
  description:
    "用户画像分布：性别、学院、年级、设备品牌（campus 维度可用但不作默认引导）。问比例/构成时调用。",
  inputSchema: z.object({
    dim: z.enum(["gender", "campus", "college", "grade", "deviceBrand"]).optional(),
  }),
  render: { component: "AdminChart" },
  execute: async (input) => {
    const data = await fetchUserDistribution();
    const dim = input.dim ?? "college";
    const rows = data[dim];
    return {
      chartType: "pie" as const,
      title: `用户分布（${dim}）`,
      categories: rows.map((r) => r.key),
      series: [{ name: "人数", data: rows.map((r) => r.count) }],
    };
  },
});

export const adminSettingsDistributionTool = tool({
  name: "admin_settings_distribution",
  description: "App 设置分布：主题、首屏课表、应用内打开网页、Agent 开关。",
  inputSchema: z.object({
    dim: z.enum(["theme", "homeIsTimetable", "openWebInApp", "agentEnabled"]).optional(),
  }),
  render: { component: "AdminChart" },
  execute: async (input) => {
    const data = await fetchSettingsDistribution();
    const dim = input.dim ?? "theme";
    const rows = data[dim];
    return {
      chartType: "pie" as const,
      title: `设置分布（${dim}）`,
      categories: rows.map((r) => r.key),
      series: [{ name: "人数", data: rows.map((r) => r.count) }],
    };
  },
});
