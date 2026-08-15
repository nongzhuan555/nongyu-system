import { MAJOR_SLOT_COUNT, slotIndexFromPeriod, spanRowsFromPeriods } from "./courseTimes";
import type { CourseEntry, GridCell, ScheduleEntry, WeekGridData } from "./types";

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

/**
 * 构建单周 5×7 矩阵；连堂写入 primary + occupied
 * 仅处理课程，不填日程
 */
export function buildWeekGrid(week: number, courses: CourseEntry[]): WeekGridData {
  const grid = emptyGrid();

  for (const course of courses) {
    if (!weekMatches(week, course)) continue;

    const col = Math.min(7, Math.max(1, course.day)) - 1;
    const startRow = slotIndexFromPeriod(course.startPeriod);
    const spanRows = spanRowsFromPeriods(course.startPeriod, course.endPeriod);

    const existing = grid[startRow]![col];
    if (existing?.kind === "primary" || existing?.kind === "occupied") {
      continue;
    }

    grid[startRow]![col] = { kind: "primary", course, spanRows };

    for (let s = 1; s < spanRows; s++) {
      const r = startRow + s;
      if (r >= MAJOR_SLOT_COUNT) break;
      if (grid[r]![col] != null) break;
      grid[r]![col] = { kind: "occupied", primaryRow: startRow };
    }
  }

  return grid;
}

/**
 * 构建单周矩阵：课程优先，日程填空格（冲突时课程保留，日程跳过）
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
    if (existing != null) {
      // 课程优先：该格已被课程占用，日程跳过
      continue;
    }

    grid[startRow]![col] = { kind: "schedule", schedule, spanRows };

    for (let s = 1; s < spanRows; s++) {
      const r = startRow + s;
      if (r >= MAJOR_SLOT_COUNT) break;
      if (grid[r]![col] != null) break;
      grid[r]![col] = { kind: "occupied", primaryRow: startRow };
    }
  }

  return grid;
}

/**
 * 预构建 1…maxWeek 全部周矩阵（仅课程）
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
 * 预构建 1…maxWeek 全部周矩阵（课程 + 日程）
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
