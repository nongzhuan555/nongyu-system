import type { GridItemLayout } from "../types/dashboard";

export const WIDGET_IDS = [
  "kpi-total-users",
  "kpi-dau",
  "kpi-online",
  "kpi-today-new",
  "kpi-web-pv",
  "chart-user-growth",
  "chart-active-days-ranking",
  "chart-gender",
  "chart-college",
  "chart-grade",
  "chart-device",
  "chart-screen-views",
  "chart-screen-dwell",
  "chart-button-clicks",
  "chart-perf",
  "chart-web-vitals",
  "table-crashes",
] as const;

export type WidgetId = (typeof WIDGET_IDS)[number];

export type GridBreakpoint = "lg" | "md" | "xs";

function item(
  i: WidgetId,
  x: number,
  y: number,
  w: number,
  h: number,
  minW: number,
  minH: number,
): GridItemLayout {
  return { i, x, y, w, h, minW, minH };
}

const kpi = (id: WidgetId, x: number, y: number, w: number) => item(id, x, y, w, 2, 2, 2);
const chart = (id: WidgetId, x: number, y: number, w: number, h: number) =>
  item(id, x, y, w, h, 3, 3);
const table = (id: WidgetId, x: number, y: number, w: number, h: number) =>
  item(id, x, y, w, h, 4, 4);

/** 默认布局（含用户活跃排行，紧挨增长趋势） */
export const DEFAULT_LAYOUTS: Record<GridBreakpoint, GridItemLayout[]> = {
  lg: [
    kpi("kpi-total-users", 0, 0, 3),
    kpi("kpi-dau", 3, 0, 3),
    kpi("kpi-online", 6, 0, 3),
    kpi("kpi-today-new", 9, 0, 3),
    kpi("kpi-web-pv", 0, 2, 3),
    chart("chart-user-growth", 3, 2, 9, 4),
    chart("chart-active-days-ranking", 0, 6, 12, 5),
    chart("chart-gender", 0, 11, 4, 4),
    chart("chart-grade", 4, 11, 4, 4),
    chart("chart-device", 8, 11, 4, 4),
    chart("chart-college", 0, 15, 6, 5),
    chart("chart-screen-views", 6, 15, 6, 5),
    chart("chart-screen-dwell", 0, 20, 12, 5),
    chart("chart-button-clicks", 0, 25, 12, 5),
    chart("chart-perf", 0, 30, 6, 5),
    chart("chart-web-vitals", 6, 30, 6, 7),
    table("table-crashes", 0, 37, 12, 5),
  ],
  md: [
    kpi("kpi-total-users", 0, 0, 4),
    kpi("kpi-dau", 4, 0, 4),
    kpi("kpi-online", 0, 2, 4),
    kpi("kpi-today-new", 4, 2, 4),
    kpi("kpi-web-pv", 0, 4, 4),
    chart("chart-user-growth", 0, 6, 8, 4),
    chart("chart-active-days-ranking", 0, 10, 8, 5),
    chart("chart-gender", 0, 15, 4, 4),
    chart("chart-grade", 4, 15, 4, 4),
    chart("chart-device", 0, 19, 8, 4),
    chart("chart-college", 0, 23, 8, 5),
    chart("chart-screen-views", 0, 28, 8, 5),
    chart("chart-screen-dwell", 0, 33, 8, 5),
    chart("chart-button-clicks", 0, 38, 8, 5),
    chart("chart-perf", 0, 43, 8, 5),
    chart("chart-web-vitals", 0, 48, 8, 7),
    table("table-crashes", 0, 55, 8, 5),
  ],
  xs: [
    kpi("kpi-total-users", 0, 0, 4),
    kpi("kpi-dau", 0, 2, 4),
    kpi("kpi-online", 0, 4, 4),
    kpi("kpi-today-new", 0, 6, 4),
    kpi("kpi-web-pv", 0, 8, 4),
    chart("chart-user-growth", 0, 10, 4, 4),
    chart("chart-active-days-ranking", 0, 14, 4, 5),
    chart("chart-gender", 0, 19, 4, 4),
    chart("chart-grade", 0, 23, 4, 4),
    chart("chart-device", 0, 27, 4, 4),
    chart("chart-college", 0, 31, 4, 5),
    chart("chart-screen-views", 0, 36, 4, 5),
    chart("chart-screen-dwell", 0, 41, 4, 5),
    chart("chart-button-clicks", 0, 46, 4, 5),
    chart("chart-perf", 0, 51, 4, 5),
    chart("chart-web-vitals", 0, 56, 4, 7),
    table("table-crashes", 0, 63, 4, 5),
  ],
};

export const GRID_BREAKPOINTS = { lg: 1200, md: 768, xs: 0 };
export const GRID_COLS = { lg: 12, md: 8, xs: 4 };
export const GRID_ROW_HEIGHT = 56;
