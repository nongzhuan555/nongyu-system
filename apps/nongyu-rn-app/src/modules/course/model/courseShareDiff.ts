import {
  MAJOR_SLOT_COUNT,
  WEEKDAY_LABELS,
  slotIndexFromPeriod,
  spanRowsFromPeriods,
} from "./courseTimes";
import type { CourseEntry } from "./types";
import { weekMatches } from "./weekMatrix";

/** Diff 单元格类型 */
export type DiffCellKind = "onlyMine" | "onlyPeer" | "both" | "neither";

export type DiffOverlayGrid = DiffCellKind[][];

function emptyBoolGrid(): boolean[][] {
  return Array.from({ length: MAJOR_SLOT_COUNT }, () => Array.from({ length: 7 }, () => false));
}

/**
 * 某周课程占用矩阵（连堂各行均标记）
 */
export function buildOccupancyMatrix(week: number, courses: CourseEntry[]): boolean[][] {
  const grid = emptyBoolGrid();
  for (const course of courses) {
    if (!weekMatches(week, course)) continue;
    const col = Math.min(7, Math.max(1, course.day)) - 1;
    const startRow = slotIndexFromPeriod(course.startPeriod);
    const spanRows = spanRowsFromPeriods(course.startPeriod, course.endPeriod);
    for (let s = 0; s < spanRows; s++) {
      const r = startRow + s;
      if (r >= MAJOR_SLOT_COUNT) break;
      grid[r]![col] = true;
    }
  }
  return grid;
}

/**
 * 构建 Diff 叠色矩阵（conflict / free 共用占用分类；UI 按 mode 着色）
 */
export function buildDiffOverlay(
  week: number,
  mine: CourseEntry[],
  peer: CourseEntry[],
): DiffOverlayGrid {
  const a = buildOccupancyMatrix(week, mine);
  const b = buildOccupancyMatrix(week, peer);
  const out: DiffOverlayGrid = Array.from({ length: MAJOR_SLOT_COUNT }, () =>
    Array.from({ length: 7 }, () => "neither" as DiffCellKind),
  );

  for (let r = 0; r < MAJOR_SLOT_COUNT; r++) {
    for (let c = 0; c < 7; c++) {
      const mineOcc = a[r]![c]!;
      const peerOcc = b[r]![c]!;
      if (mineOcc && peerOcc) out[r]![c] = "both";
      else if (mineOcc) out[r]![c] = "onlyMine";
      else if (peerOcc) out[r]![c] = "onlyPeer";
      else out[r]![c] = "neither";
    }
  }
  return out;
}

/** Agent / 摘要用的可读时段 */
export type DiffSlotSummary = {
  day: number;
  startPeriod: number;
  endPeriod: number;
  label: string;
};

function periodsForRow(row: number): { startPeriod: number; endPeriod: number } {
  const startPeriod = row * 2 + 1;
  return { startPeriod, endPeriod: startPeriod + 1 };
}

function slotLabel(dayIndex: number, row: number): string {
  const { startPeriod, endPeriod } = periodsForRow(row);
  const weekday = WEEKDAY_LABELS[dayIndex] ?? `周${dayIndex + 1}`;
  return `${weekday} ${startPeriod}-${endPeriod}节`;
}

/**
 * 从叠色矩阵抽出指定 kind 的时段列表（先周一后周日，先上午后晚上）
 */
export function collectDiffSlots(overlay: DiffOverlayGrid, kind: DiffCellKind): DiffSlotSummary[] {
  const out: DiffSlotSummary[] = [];
  for (let c = 0; c < 7; c++) {
    for (let r = 0; r < MAJOR_SLOT_COUNT; r++) {
      if (overlay[r]![c] !== kind) continue;
      const { startPeriod, endPeriod } = periodsForRow(r);
      out.push({
        day: c + 1,
        startPeriod,
        endPeriod,
        label: slotLabel(c, r),
      });
    }
  }
  return out;
}

export type DiffWeekCounts = {
  week: number;
  conflictCount: number;
  freeCount: number;
};

/**
 * 统计一周冲突格（both）与空档格（neither）数量
 */
export function countDiffKinds(overlay: DiffOverlayGrid): { conflict: number; free: number } {
  let conflict = 0;
  let free = 0;
  for (let r = 0; r < MAJOR_SLOT_COUNT; r++) {
    for (let c = 0; c < 7; c++) {
      const kind = overlay[r]![c];
      if (kind === "both") conflict += 1;
      else if (kind === "neither") free += 1;
    }
  }
  return { conflict, free };
}
