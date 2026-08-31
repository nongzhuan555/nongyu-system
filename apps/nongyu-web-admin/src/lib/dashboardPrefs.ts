import type { DashboardPrefsV1, GridItemLayout, GrowthRange } from "../types/dashboard";
import { STORAGE_DASHBOARD_PREFS_KEY } from "./constants";
import { DEFAULT_LAYOUTS, WIDGET_IDS, type GridBreakpoint, type WidgetId } from "./dashboardLayout";

const GROWTH_RANGES: GrowthRange[] = ["7d", "30d", "90d", "180d", "365d"];
const BREAKPOINTS: GridBreakpoint[] = ["lg", "md", "xs"];

function isGrowthRange(value: unknown): value is GrowthRange {
  return typeof value === "string" && GROWTH_RANGES.includes(value as GrowthRange);
}

function isWidgetId(value: unknown): value is WidgetId {
  return typeof value === "string" && (WIDGET_IDS as readonly string[]).includes(value);
}

function sanitizeItems(items: unknown, fallback: GridItemLayout[]): GridItemLayout[] {
  if (!Array.isArray(items)) return fallback;
  const known = new Map<string, GridItemLayout>();
  for (const item of items) {
    if (item === null || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (!isWidgetId(row.i)) continue;
    if (typeof row.x !== "number" || typeof row.y !== "number") continue;
    if (typeof row.w !== "number" || typeof row.h !== "number") continue;
    const def = fallback.find((item) => item.i === row.i);
    known.set(row.i, {
      i: row.i,
      x: row.x,
      y: row.y,
      w: row.w,
      h: row.h,
      minW: def?.minW,
      minH: def?.minH,
    });
  }
  return fallback.map((def) => known.get(def.i) ?? def);
}

/** 合并 breakpoints，避免 Responsive 只回传部分断点时丢失其它断面的已存布局 */
export function mergeDashboardLayouts(
  prev: DashboardPrefsV1["layouts"],
  incoming: Partial<Record<GridBreakpoint, GridItemLayout[]>>,
): DashboardPrefsV1["layouts"] {
  const merged: DashboardPrefsV1["layouts"] = { ...prev };
  for (const bp of BREAKPOINTS) {
    if (Array.isArray(incoming[bp])) {
      merged[bp] = sanitizeItems(incoming[bp], DEFAULT_LAYOUTS[bp]);
    }
  }
  return merged;
}

function sanitizeLayouts(raw: unknown): DashboardPrefsV1["layouts"] {
  const source = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const layouts: DashboardPrefsV1["layouts"] = {};
  for (const bp of BREAKPOINTS) {
    layouts[bp] = sanitizeItems(source[bp], DEFAULT_LAYOUTS[bp]);
  }
  return layouts;
}

export function defaultDashboardPrefs(): DashboardPrefsV1 {
  return {
    version: 1,
    growthRange: "7d",
    layouts: {
      lg: DEFAULT_LAYOUTS.lg,
      md: DEFAULT_LAYOUTS.md,
      xs: DEFAULT_LAYOUTS.xs,
    },
  };
}

export function readDashboardPrefs(): DashboardPrefsV1 {
  const fallback = defaultDashboardPrefs();
  try {
    const raw = localStorage.getItem(STORAGE_DASHBOARD_PREFS_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") return fallback;
    const record = parsed as Record<string, unknown>;
    if (record.version !== 1) return fallback;
    return {
      version: 1,
      growthRange: isGrowthRange(record.growthRange) ? record.growthRange : "7d",
      layouts: sanitizeLayouts(record.layouts),
    };
  } catch {
    return fallback;
  }
}

export function writeDashboardPrefs(prefs: DashboardPrefsV1): void {
  try {
    localStorage.setItem(STORAGE_DASHBOARD_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // 隐私模式或配额满时忽略，本会话仍用内存布局
  }
}

export function clearDashboardPrefs(): void {
  try {
    localStorage.removeItem(STORAGE_DASHBOARD_PREFS_KEY);
  } catch {
    // 忽略
  }
}
