import type { CourseEntry, ScheduleEntry } from "./types";
import { weekMatches } from "./weekMatrix";

function periodsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/**
 * 日程是否与某课程重叠（同星期 + 节次交叉 + 周次有交集）
 */
export function scheduleOverlapsCourse(
  schedule: Pick<ScheduleEntry, "day" | "startPeriod" | "endPeriod" | "weeksList">,
  course: CourseEntry,
): boolean {
  if (schedule.day !== course.day) return false;
  if (
    !periodsOverlap(schedule.startPeriod, schedule.endPeriod, course.startPeriod, course.endPeriod)
  ) {
    return false;
  }
  if (schedule.weeksList.length === 0) {
    // 全周日程：只要星期/节次与课交叉即视为重叠
    return true;
  }
  return schedule.weeksList.some((w) => weekMatches(w, course));
}

/**
 * 日程是否与课程列表中任一门重叠
 */
export function scheduleOverlapsAnyCourse(
  schedule: Pick<ScheduleEntry, "day" | "startPeriod" | "endPeriod" | "weeksList">,
  courses: CourseEntry[],
): boolean {
  return courses.some((c) => scheduleOverlapsCourse(schedule, c));
}
