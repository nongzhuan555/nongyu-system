import { toIsoUtcRequired, formatDateOnly } from "../../lib/time.js";
import { boolFromDb } from "../../lib/util.js";
import type { UserRow } from "./repo.js";
import type { SettingsRow } from "../settings/repo.js";
import { DEFAULT_SETTINGS } from "../settings/repo.js";

export type AppUserProfile = {
  id: number;
  studentNo: string;
  name: string;
  major: string | null;
  college: string | null;
  className: string | null;
  grade: string | null;
  gender: 0 | 1 | 2;
  hometown: string | null;
  campus: string | null;
  qq: string | null;
  role: 0 | 1 | 2;
  createdAt: string;
};

export function toAppUserProfile(user: UserRow): AppUserProfile {
  return {
    id: Number(user.id),
    studentNo: user.student_no,
    name: user.name,
    major: user.major,
    college: user.college,
    className: user.class_name,
    grade: user.grade,
    gender: user.gender,
    hometown: user.hometown,
    campus: user.campus,
    qq: user.qq,
    role: user.role,
    createdAt: toIsoUtcRequired(user.created_at),
  };
}

export type UserSettingsDto = {
  theme: "sicau_green" | "sakura_pink" | "dark" | "system";
  homeIsTimetable: boolean;
  openWebInApp: boolean;
  agentEnabled: boolean;
  highlightTodayColumn: boolean;
  courseCardColorMode: "distinct" | "unified";
  courseCardUnifiedColor: string | null;
  semesterStartDate: string | null;
  timetableBgUri: string | null;
  updatedAt: string;
};

export function toUserSettingsDto(row: SettingsRow | null): UserSettingsDto {
  if (!row) {
    return {
      ...DEFAULT_SETTINGS,
      updatedAt: new Date().toISOString(),
    };
  }
  return {
    theme: row.theme as UserSettingsDto["theme"],
    homeIsTimetable: boolFromDb(row.home_is_timetable),
    openWebInApp: boolFromDb(row.open_web_in_app),
    agentEnabled: boolFromDb(row.agent_enabled),
    highlightTodayColumn: boolFromDb(row.highlight_today_column),
    courseCardColorMode: row.course_card_color_mode as UserSettingsDto["courseCardColorMode"],
    courseCardUnifiedColor: row.course_card_unified_color,
    semesterStartDate: formatDateOnly(row.semester_start_date),
    timetableBgUri: row.timetable_bg_uri,
    updatedAt: toIsoUtcRequired(row.updated_at),
  };
}
