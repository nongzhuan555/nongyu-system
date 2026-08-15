import { getCourseInfo } from "nongyu-tool-jiaowu";
import { mapJiaowuCourseItems, mergeAdjacentCourseEntries } from "../model/mapJiaowuCourseItems";
import type { CourseEntry } from "../model/types";
import { hasLocalCourses, readLocalCourses, writeLocalCourses } from "./courseLocalStore";
import { CourseShareError, syncShareIfEnabled } from "./courseShareRepository";

export type ListCoursesResult = {
  success: boolean;
  courses: CourseEntry[];
  message?: string;
  /** 数据是否来自本地缓存 */
  fromLocal?: boolean;
  /** 课表写入成功但共享快照同步失败时的提示 */
  shareSyncWarning?: string;
};

/**
 * 强制从教务抓取并覆盖本地
 */
export async function fetchAndPersistCourses(studentId: string): Promise<ListCoursesResult> {
  const res = await getCourseInfo();
  if (!res.success) {
    return {
      success: false,
      courses: mergeAdjacentCourseEntries(readLocalCourses(studentId) ?? []),
      fromLocal: hasLocalCourses(studentId),
      message: "message" in res && typeof res.message === "string" ? res.message : "课表获取失败",
    };
  }
  const courses = mapJiaowuCourseItems(res.result);
  writeLocalCourses(studentId, courses);

  let shareSyncWarning: string | undefined;
  try {
    await syncShareIfEnabled(studentId, courses);
  } catch (err) {
    if (err instanceof CourseShareError) {
      shareSyncWarning = err.message;
    }
  }

  return { success: true, courses, fromLocal: false, shareSyncWarning };
}

/**
 * 默认读本地；本地没有才抓教务并落盘。
 * 读本地时再跑一遍相邻连堂合并（兼容旧缓存未合并数据）。
 */
export async function loadCourses(studentId: string): Promise<ListCoursesResult> {
  if (hasLocalCourses(studentId)) {
    const courses = mergeAdjacentCourseEntries(readLocalCourses(studentId) ?? []);
    return {
      success: true,
      courses,
      fromLocal: true,
    };
  }
  return fetchAndPersistCourses(studentId);
}
