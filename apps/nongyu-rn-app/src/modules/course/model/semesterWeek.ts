import dayjs from "dayjs";
import type { CourseEntry } from "./types";
import { maxWeekFromCourses } from "./weekMatrix";

/**
 * 开学日所在自然周的周一 00:00（本地）
 * 对齐旧 computeCurrentWeek / getMondayOfWeek 语义
 */
export function getSemesterFirstMonday(startDate: Date): Date {
  const start = dayjs(startDate).startOf("day");
  const dow = start.day() === 0 ? 7 : start.day(); // 1=周一 … 7=周日
  return start.add(1 - dow, "day").toDate();
}

/**
 * 由开学日计算「今天」是第几教学周（至少为 1）
 */
export function computeCurrentWeek(startDate: Date, now: Date = new Date()): number {
  const monday = dayjs(getSemesterFirstMonday(startDate));
  const current = dayjs(now).startOf("day");
  const diffDays = current.diff(monday, "day");
  const week = Math.floor(diffDays / 7) + 1;
  return Math.max(1, week);
}

/**
 * 本学期教务课是否已全部上完（仅统计教务课最大周，不含自定义日程）
 */
export function isSemesterCoursesFinished(args: {
  semesterStart: Date | null;
  courses: CourseEntry[];
  now?: Date;
}): boolean {
  const { semesterStart, courses, now } = args;
  if (!semesterStart || courses.length === 0) return false;
  const maxWeek = maxWeekFromCourses(courses);
  return computeCurrentWeek(semesterStart, now) > maxWeek;
}

/**
 * 第 week 周（1-based）的周一
 */
export function getMondayOfWeek(week: number, startDate: Date): Date {
  const firstMonday = dayjs(getSemesterFirstMonday(startDate));
  return firstMonday.add(week - 1, "week").toDate();
}

/**
 * 表头月日：M/D
 */
export function formatMonthDay(date: Date): string {
  return `${dayjs(date).month() + 1}/${dayjs(date).date()}`;
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return dayjs(a).isSame(dayjs(b), "day");
}
