import type { CourseEntry } from "../model/types";
import { mergeAdjacentCourseEntries } from "../model/mapJiaowuCourseItems";
import { readLocalCourses } from "./courseLocalStore";
import {
  getMyShareStatusApi,
  getShareByStudentNoApi,
  putMyShareApi,
  type CourseSharePeer,
  type CourseShareStatus,
} from "./courseShareApi";
import { readLocalShareEnabled, writeLocalShareEnabled } from "./courseShareLocalStore";

export class CourseShareError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CourseShareError";
  }
}

export async function fetchMyShareStatus(studentId: string): Promise<CourseShareStatus> {
  const status = await getMyShareStatusApi();
  writeLocalShareEnabled(studentId, status.shareEnabled);
  return status;
}

/**
 * 开启共享：上传当前本地课表
 */
export async function enableShare(studentId: string): Promise<CourseShareStatus> {
  const courses = mergeAdjacentCourseEntries(readLocalCourses(studentId) ?? []);
  if (courses.length === 0) {
    throw new CourseShareError("请先到课表页获取课表后再开启共享");
  }
  const status = await putMyShareApi({ enabled: true, courses });
  writeLocalShareEnabled(studentId, true);
  return status;
}

/**
 * 关闭共享并清空远端快照
 */
export async function disableShare(studentId: string): Promise<CourseShareStatus> {
  const status = await putMyShareApi({ enabled: false });
  writeLocalShareEnabled(studentId, false);
  return status;
}

/**
 * 强制刷新课表成功后：若本地标记开启则覆盖远端
 */
export async function syncShareIfEnabled(studentId: string, courses: CourseEntry[]): Promise<void> {
  if (!readLocalShareEnabled(studentId)) return;
  if (courses.length === 0) return;
  try {
    await putMyShareApi({ enabled: true, courses });
  } catch {
    // 不阻断刷新；由调用方可选 Toast
    throw new CourseShareError("课表已更新，但共享快照同步失败");
  }
}

export async function lookupPeer(studentNo: string): Promise<CourseSharePeer> {
  const peer = await getShareByStudentNoApi(studentNo);
  return {
    ...peer,
    courses: mergeAdjacentCourseEntries(peer.courses),
  };
}
