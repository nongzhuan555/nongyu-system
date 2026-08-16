import type { AttendanceStatus, CourseAttendance } from "./types";

export type CourseAttendanceCounts = {
  late: number;
  absent: number;
  leave: number;
  nocheck: number;
};

/** 详情用：含签到的全量计数 */
export type CourseAttendanceFullCounts = CourseAttendanceCounts & {
  present: number;
};

/** 本节考勤索引键：courseId:week:day */
export function attendanceSlotKey(courseId: string, week: number, day: number): string {
  return `${courseId}:${week}:${day}`;
}

/**
 * 按 courseId 汇总全学期迟到/缺勤/请假/未考勤次数（不含签到）
 */
export function countAttendanceByCourseId(
  attendances: CourseAttendance[],
): Map<string, CourseAttendanceCounts> {
  const map = new Map<string, CourseAttendanceCounts>();
  for (const a of attendances) {
    if (a.status === "present") continue;
    let row = map.get(a.courseId);
    if (!row) {
      row = { late: 0, absent: 0, leave: 0, nocheck: 0 };
      map.set(a.courseId, row);
    }
    if (a.status === "late") row.late += 1;
    else if (a.status === "absent") row.absent += 1;
    else if (a.status === "leave") row.leave += 1;
    else if (a.status === "nocheck") row.nocheck += 1;
  }
  return map;
}

/** 单门课五态全量计数（含签到） */
export function countFullAttendanceForCourse(
  attendances: CourseAttendance[],
): CourseAttendanceFullCounts {
  const row: CourseAttendanceFullCounts = {
    present: 0,
    late: 0,
    absent: 0,
    leave: 0,
    nocheck: 0,
  };
  for (const a of attendances) {
    if (a.status === "present") row.present += 1;
    else if (a.status === "late") row.late += 1;
    else if (a.status === "absent") row.absent += 1;
    else if (a.status === "leave") row.leave += 1;
    else if (a.status === "nocheck") row.nocheck += 1;
  }
  return row;
}

/** 本节短标签：签/迟/缺/假/未 */
export const SESSION_SHORT_LABEL: Record<AttendanceStatus, string> = {
  present: "签",
  late: "迟",
  absent: "缺",
  leave: "假",
  nocheck: "未",
};

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "签到",
  late: "迟到",
  absent: "缺勤",
  leave: "请假",
  nocheck: "未考勤",
};

const SEMESTER_STATUS_LABEL: Record<Exclude<AttendanceStatus, "present">, string> = {
  absent: "缺",
  late: "迟",
  leave: "假",
  nocheck: "未",
};

/**
 * 紧凑学期汇总：仅非零项，如「缺2·迟1·未1」；全零返回 null
 */
export function formatAttendanceSummary(counts: CourseAttendanceCounts | undefined): string | null {
  if (!counts) return null;
  const parts: string[] = [];
  if (counts.absent > 0) parts.push(`${SEMESTER_STATUS_LABEL.absent}${counts.absent}`);
  if (counts.late > 0) parts.push(`${SEMESTER_STATUS_LABEL.late}${counts.late}`);
  if (counts.leave > 0) parts.push(`${SEMESTER_STATUS_LABEL.leave}${counts.leave}`);
  if (counts.nocheck > 0) parts.push(`${SEMESTER_STATUS_LABEL.nocheck}${counts.nocheck}`);
  return parts.length > 0 ? parts.join("·") : null;
}

/**
 * 详情全量汇总：完整中文状态名 + 次数，如「签到 3 · 迟到 1 · 未考勤 2」
 */
export function formatFullAttendanceSummary(
  counts: CourseAttendanceFullCounts | undefined,
): string | null {
  if (!counts) return null;
  const parts: string[] = [];
  if (counts.present > 0) parts.push(`${ATTENDANCE_STATUS_LABEL.present} ${counts.present}`);
  if (counts.absent > 0) parts.push(`${ATTENDANCE_STATUS_LABEL.absent} ${counts.absent}`);
  if (counts.late > 0) parts.push(`${ATTENDANCE_STATUS_LABEL.late} ${counts.late}`);
  if (counts.leave > 0) parts.push(`${ATTENDANCE_STATUS_LABEL.leave} ${counts.leave}`);
  if (counts.nocheck > 0) parts.push(`${ATTENDANCE_STATUS_LABEL.nocheck} ${counts.nocheck}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * 课程卡仅展示本节完整状态名（迟到/请假…）；无记录返回 null。
 * 学期汇总不在卡片上展示，见详情弹窗。
 */
export function formatCardSessionLabel(
  session: AttendanceStatus | null | undefined,
): string | null {
  return session ? ATTENDANCE_STATUS_LABEL[session] : null;
}

/** courseId:week:day → status */
export function indexAttendanceBySlot(
  attendances: CourseAttendance[],
): Map<string, AttendanceStatus> {
  const map = new Map<string, AttendanceStatus>();
  for (const a of attendances) {
    map.set(attendanceSlotKey(a.courseId, a.week, a.day), a.status);
  }
  return map;
}

/** 某课全学期记录，按周、日升序 */
export function listAttendancesForCourse(
  attendances: CourseAttendance[],
  courseId: string,
): CourseAttendance[] {
  return attendances
    .filter((a) => a.courseId === courseId)
    .slice()
    .sort((a, b) => a.week - b.week || a.day - b.day);
}
