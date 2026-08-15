import { boolFromDb } from "../../lib/util.js";
import { toIsoUtcRequired } from "../../lib/time.js";

export type CourseShareRow = {
  user_id: number;
  student_no: string;
  share_enabled: number | boolean;
  courses_json: unknown;
  updated_at: Date;
};

export type CourseShareStatusDto = {
  shareEnabled: boolean;
  updatedAt: string | null;
};

export type CourseSharePeerDto = {
  studentNo: string;
  courses: unknown[];
  updatedAt: string;
};

export type CourseEntryDto = {
  id: string;
  name: string;
  teacher: string;
  room: string;
  day: number;
  startPeriod: number;
  endPeriod: number;
  weeks: { start: number; end: number };
  weeksList?: number[];
  odd: boolean;
  even: boolean;
};

function parseCoursesJson(raw: unknown): CourseEntryDto[] {
  if (raw == null) return [];
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed as CourseEntryDto[];
}

export function toShareStatusDto(row: CourseShareRow | null): CourseShareStatusDto {
  if (!row) {
    return { shareEnabled: false, updatedAt: null };
  }
  return {
    shareEnabled: boolFromDb(row.share_enabled),
    updatedAt: toIsoUtcRequired(row.updated_at),
  };
}

/**
 * 仅当开启且有载荷时返回 peer DTO；否则 null（由路由统一 404）
 */
export function toPeerDtoIfShareable(row: CourseShareRow | null): CourseSharePeerDto | null {
  if (!row || !boolFromDb(row.share_enabled)) return null;
  const courses = parseCoursesJson(row.courses_json);
  if (courses.length === 0) return null;
  return {
    studentNo: row.student_no,
    courses,
    updatedAt: toIsoUtcRequired(row.updated_at),
  };
}
