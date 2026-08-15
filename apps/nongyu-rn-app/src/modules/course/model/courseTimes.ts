/** 川农常见作息：10 小节对应起止时刻（对齐旧版 COURSE_TIMES） */
export const COURSE_TIMES = [
  { start: "08:10", end: "08:55" },
  { start: "09:05", end: "09:50" },
  { start: "10:10", end: "10:55" },
  { start: "11:05", end: "11:50" },
  { start: "14:20", end: "15:05" },
  { start: "15:15", end: "16:00" },
  { start: "16:20", end: "17:05" },
  { start: "17:15", end: "18:00" },
  { start: "19:30", end: "20:15" },
  { start: "20:25", end: "21:10" },
] as const;

export const WEEKDAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"] as const;

/** 大课区间行数（每天 5 格） */
export const MAJOR_SLOT_COUNT = 5;

/**
 * 节次 → 大课区间行（0–4）
 */
export function slotIndexFromPeriod(period: number): number {
  if (period <= 2) return 0;
  if (period <= 4) return 1;
  if (period <= 6) return 2;
  if (period <= 8) return 3;
  return 4;
}

/**
 * 起止节次跨几个大课区间
 */
export function spanRowsFromPeriods(startPeriod: number, endPeriod: number): number {
  const startRow = slotIndexFromPeriod(startPeriod);
  const endRow = slotIndexFromPeriod(endPeriod);
  return Math.max(1, endRow - startRow + 1);
}
