import type { GridItemLayout } from "../types/dashboard";

export const WIDGET_IDS = [
  "kpi-total-users",
  "kpi-dau",
  "kpi-online",
  "kpi-today-new",
  "chart-user-growth",
  "chart-gender",
  "chart-campus",
  "chart-college",
  "chart-grade",
  "chart-device",
  "chart-screen-views",
  "chart-screen-dwell",
  "chart-button-clicks",
  "chart-settings",
  "chart-perf",
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

export const DEFAULT_LAYOUTS: Record<GridBreakpoint, GridItemLayout[]> = {
  lg: [
    kpi("kpi-total-users", 0, 0, 3),
    kpi("kpi-dau", 3, 0, 3),
    kpi("kpi-online", 6, 0, 3),
    kpi("kpi-today-new", 9, 0, 3),
    chart("chart-user-growth", 0, 2, 12, 4),
    chart("chart-gender", 0, 6, 3, 4),
    chart("chart-campus", 3, 6, 3, 4),
    chart("chart-grade", 6, 6, 3, 4),
    chart("chart-device", 9, 6, 3, 4),
    chart("chart-college", 0, 10, 6, 5),
    chart("chart-screen-views", 6, 10, 6, 5),
    chart("chart-screen-dwell", 0, 15, 6, 5),
    chart("chart-settings", 6, 15, 6, 5),
    chart("chart-button-clicks", 0, 20, 12, 5),
    chart("chart-perf", 0, 25, 12, 5),
    table("table-crashes", 0, 30, 12, 5),
  ],
  md: [
    kpi("kpi-total-users", 0, 0, 4),
    kpi("kpi-dau", 4, 0, 4),
    kpi("kpi-online", 0, 2, 4),
    kpi("kpi-today-new", 4, 2, 4),
    chart("chart-user-growth", 0, 4, 8, 4),
    chart("chart-gender", 0, 8, 4, 4),
    chart("chart-campus", 4, 8, 4, 4),
    chart("chart-grade", 0, 12, 4, 4),
    chart("chart-device", 4, 12, 4, 4),
    chart("chart-college", 0, 16, 8, 5),
    chart("chart-screen-views", 0, 21, 8, 5),
    chart("chart-screen-dwell", 0, 26, 8, 5),
    chart("chart-settings", 0, 31, 8, 5),
    chart("chart-button-clicks", 0, 36, 8, 5),
    chart("chart-perf", 0, 41, 8, 5),
    table("table-crashes", 0, 46, 8, 5),
  ],
  xs: [
    kpi("kpi-total-users", 0, 0, 4),
    kpi("kpi-dau", 0, 2, 4),
    kpi("kpi-online", 0, 4, 4),
    kpi("kpi-today-new", 0, 6, 4),
    chart("chart-user-growth", 0, 8, 4, 4),
    chart("chart-gender", 0, 12, 4, 4),
    chart("chart-campus", 0, 16, 4, 4),
    chart("chart-grade", 0, 20, 4, 4),
    chart("chart-device", 0, 24, 4, 4),
    chart("chart-college", 0, 28, 4, 5),
    chart("chart-screen-views", 0, 33, 4, 5),
    chart("chart-screen-dwell", 0, 38, 4, 5),
    chart("chart-settings", 0, 43, 4, 5),
    chart("chart-button-clicks", 0, 48, 4, 5),
    chart("chart-perf", 0, 53, 4, 5),
    table("table-crashes", 0, 58, 4, 5),
  ],
};

export const GRID_BREAKPOINTS = { lg: 1200, md: 768, xs: 0 };
export const GRID_COLS = { lg: 12, md: 8, xs: 4 };
export const GRID_ROW_HEIGHT = 56;
