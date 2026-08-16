import { MAJOR_SLOT_COUNT, slotIndexFromPeriod, spanRowsFromPeriods } from "./courseTimes";
import type {
  CourseEntry,
  GridCell,
  GridStack,
  ScheduleEntry,
  StackItem,
  WeekGridData,
} from "./types";

/**
 * 某课是否在指定教学周有效
 */
export function weekMatches(week: number, course: CourseEntry): boolean {
  if (Array.isArray(course.weeksList) && course.weeksList.length > 0) {
    return course.weeksList.includes(week);
  }
  if (week < course.weeks.start || week > course.weeks.end) return false;
  if (course.odd && week % 2 === 0) return false;
  if (course.even && week % 2 === 1) return false;
  return true;
}

/**
 * 某日程是否在指定教学周有效（weeksList 空数组视为全周）
 */
export function scheduleMatches(week: number, schedule: ScheduleEntry): boolean {
  if (schedule.weeksList.length === 0) return true;
  return schedule.weeksList.includes(week);
}

/**
 * 由课程列表推最大周（至少 1）
 */
export function maxWeekFromCourses(courses: CourseEntry[]): number {
  let maxW = 1;
  for (const c of courses) {
    if (c.weeksList?.length) {
      maxW = Math.max(maxW, ...c.weeksList);
    } else {
      maxW = Math.max(maxW, c.weeks.end);
    }
  }
  return Math.max(1, maxW);
}

/**
 * 由课程 + 日程列表推最大周（至少 1）
 */
export function maxWeekFromAll(courses: CourseEntry[], schedules: ScheduleEntry[]): number {
  let maxW = maxWeekFromCourses(courses);
  for (const s of schedules) {
    if (s.weeksList.length) maxW = Math.max(maxW, ...s.weeksList);
  }
  return Math.max(1, maxW);
}

function emptyGrid(): WeekGridData {
  return Array.from({ length: MAJOR_SLOT_COUNT }, () =>
    Array.from({ length: 7 }, () => null as GridCell),
  );
}

function sortStackItems(items: StackItem[]): StackItem[] {
  const courses = items.filter((i) => i.type === "course");
  const schedules = items
    .filter((i): i is Extract<StackItem, { type: "schedule" }> => i.type === "schedule")
    .slice()
    .sort((a, b) => a.schedule.createdAt.localeCompare(b.schedule.createdAt));
  return [...courses, ...schedules];
}

function writeOccupied(grid: WeekGridData, startRow: number, col: number, spanRows: number): void {
  for (let s = 1; s < spanRows; s++) {
    const r = startRow + s;
    if (r >= MAJOR_SLOT_COUNT) break;
    if (grid[r]![col] != null) break;
    grid[r]![col] = { kind: "occupied", primaryRow: startRow };
  }
}

/**
 * 构建单周 5×7 矩阵；连堂写入 stack + occupied（仅课程）
 */
export function buildWeekGrid(week: number, courses: CourseEntry[]): WeekGridData {
  const grid = emptyGrid();

  for (const course of courses) {
    if (!weekMatches(week, course)) continue;

    const col = Math.min(7, Math.max(1, course.day)) - 1;
    const startRow = slotIndexFromPeriod(course.startPeriod);
    const spanRows = spanRowsFromPeriods(course.startPeriod, course.endPeriod);

    const existing = grid[startRow]![col];
    if (existing?.kind === "stack" || existing?.kind === "occupied") {
      // 同格多课：保留先写入（T1）
      continue;
    }

    grid[startRow]![col] = {
      kind: "stack",
      items: [{ type: "course", course }],
      spanRows,
    };
    writeOccupied(grid, startRow, col, spanRows);
  }

  return grid;
}

/**
 * 构建单周矩阵：课程优先置顶；日程可与课程冲突并入同一 stack
 */
export function buildWeekGridWithSchedules(
  week: number,
  courses: CourseEntry[],
  schedules: ScheduleEntry[],
): WeekGridData {
  const grid = buildWeekGrid(week, courses);

  for (const schedule of schedules) {
    if (!scheduleMatches(week, schedule)) continue;

    const col = Math.min(7, Math.max(1, schedule.day)) - 1;
    const startRow = slotIndexFromPeriod(schedule.startPeriod);
    const spanRows = spanRowsFromPeriods(schedule.startPeriod, schedule.endPeriod);

    const existing = grid[startRow]![col];
    if (existing?.kind === "occupied") {
      // 落在连堂占位行：不写入（避免破坏跨行结构）
      continue;
    }

    if (existing?.kind === "stack") {
      const nextItems = sortStackItems([...existing.items, { type: "schedule", schedule }]);
      // span 以课程为准；无课则取较大 span
      const courseSpan = existing.items.find((i) => i.type === "course")
        ? existing.spanRows
        : Math.max(existing.spanRows, spanRows);
      grid[startRow]![col] = {
        kind: "stack",
        items: nextItems,
        spanRows: courseSpan,
      };
      if (courseSpan > existing.spanRows) {
        writeOccupied(grid, startRow, col, courseSpan);
      }
      continue;
    }

    grid[startRow]![col] = {
      kind: "stack",
      items: [{ type: "schedule", schedule }],
      spanRows,
    };
    writeOccupied(grid, startRow, col, spanRows);
  }

  return grid;
}

/**
 * 预构建 1…maxWeek 全部周矩阵（仅课程）— 兼容旧调用；新路径请用懒窗口
 */
export function buildAllWeekMatrices(courses: CourseEntry[]): WeekGridData[] {
  const maxWeek = maxWeekFromCourses(courses);
  const weeks: WeekGridData[] = [];
  for (let w = 1; w <= maxWeek; w++) {
    weeks.push(buildWeekGrid(w, courses));
  }
  return weeks;
}

/**
 * 预构建 1…maxWeek 全部周矩阵（课程 + 日程）— 兼容旧调用；新路径请用懒窗口
 */
export function buildAllWeekMatricesWithSchedules(
  courses: CourseEntry[],
  schedules: ScheduleEntry[],
): WeekGridData[] {
  const maxWeek = maxWeekFromAll(courses, schedules);
  const weeks: WeekGridData[] = [];
  for (let w = 1; w <= maxWeek; w++) {
    weeks.push(buildWeekGridWithSchedules(w, courses, schedules));
  }
  return weeks;
}

export type WeekMatrixCache = {
  maxWeek: number;
  map: Map<number, WeekGridData>;
};

/**
 * 确保中心周 ±radius 的矩阵已构建；删除窗口外缓存
 */
export function ensureWeekWindow(
  cache: WeekMatrixCache,
  centerWeek: number,
  courses: CourseEntry[],
  schedules: ScheduleEntry[] | null,
  radius = 2,
): void {
  const lo = Math.max(1, centerWeek - radius);
  const hi = Math.min(cache.maxWeek, centerWeek + radius);
  for (let w = lo; w <= hi; w++) {
    if (!cache.map.has(w)) {
      const grid =
        schedules == null
          ? buildWeekGrid(w, courses)
          : buildWeekGridWithSchedules(w, courses, schedules);
      cache.map.set(w, grid);
    }
  }
  for (const key of Array.from(cache.map.keys())) {
    if (key < lo || key > hi) cache.map.delete(key);
  }
}

/** 取 stack 中的课程（若有） */
export function stackCourse(cell: GridStack): CourseEntry | null {
  const item = cell.items.find((i) => i.type === "course");
  return item?.type === "course" ? item.course : null;
}
