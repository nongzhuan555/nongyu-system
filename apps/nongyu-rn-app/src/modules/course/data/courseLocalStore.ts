import { appStorage } from "@/storage/mmkv";
import type { CourseEntry } from "../model/types";

const COURSES_KEY_PREFIX = "course:entries:";

function coursesKey(studentId: string): string {
  return `${COURSES_KEY_PREFIX}${studentId}`;
}

/**
 * 读取本地持久化课表（无则 null）
 */
export function readLocalCourses(studentId: string): CourseEntry[] | null {
  const raw = appStorage.getString(coursesKey(studentId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CourseEntry[];
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * 写入本地课表
 */
export function writeLocalCourses(studentId: string, courses: CourseEntry[]): void {
  appStorage.set(coursesKey(studentId), JSON.stringify(courses));
}

/**
 * 清除某用户本地课表（登出或换号时可调）
 */
export function clearLocalCourses(studentId: string): void {
  appStorage.delete(coursesKey(studentId));
}

/**
 * 是否已有本地课表（含空数组也算「有缓存」——避免空学期反复打教务）
 * 约定：从未抓取过为 null；抓取成功写入（可为 []）
 */
export function hasLocalCourses(studentId: string): boolean {
  return appStorage.getString(coursesKey(studentId)) !== undefined;
}
