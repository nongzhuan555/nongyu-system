import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getPool, type PoolConnection } from "../../lib/db.js";

export type SettingsRow = {
  id: number;
  user_id: number;
  theme: string;
  home_is_timetable: number;
  open_web_in_app: number;
  agent_enabled: number;
  highlight_today_column: number;
  course_card_color_mode: string;
  course_card_unified_color: string | null;
  semester_start_date: string | Date | null;
  timetable_bg_uri: string | null;
  created_at: Date;
  updated_at: Date;
};

export const DEFAULT_SETTINGS = {
  theme: "sicau_green" as const,
  homeIsTimetable: false,
  openWebInApp: true,
  agentEnabled: true,
  highlightTodayColumn: true,
  courseCardColorMode: "distinct" as const,
  courseCardUnifiedColor: null as string | null,
  semesterStartDate: null as string | null,
  timetableBgUri: null as string | null,
};

export async function findSettingsByUserId(
  userId: number,
  conn?: PoolConnection,
): Promise<SettingsRow | null> {
  const db = conn ?? getPool();
  const [rows] = await db.query<(SettingsRow & RowDataPacket)[]>(
    `SELECT * FROM user_settings WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
}

export async function insertDefaultSettings(userId: number, conn: PoolConnection): Promise<void> {
  await conn.query<ResultSetHeader>(`INSERT INTO user_settings (user_id) VALUES (?)`, [userId]);
}

export async function upsertSettings(
  userId: number,
  patch: Partial<{
    theme: string;
    homeIsTimetable: boolean;
    openWebInApp: boolean;
    agentEnabled: boolean;
    highlightTodayColumn: boolean;
    courseCardColorMode: string;
    courseCardUnifiedColor: string | null;
    semesterStartDate: string | null;
    timetableBgUri: string | null;
  }>,
): Promise<SettingsRow> {
  const existing = await findSettingsByUserId(userId);
  if (!existing) {
    await getPool().query(`INSERT INTO user_settings (user_id) VALUES (?)`, [userId]);
  }
  const sets: string[] = [];
  const args: unknown[] = [];
  const map: Record<string, unknown> = {
    theme: patch.theme,
    home_is_timetable:
      patch.homeIsTimetable === undefined ? undefined : patch.homeIsTimetable ? 1 : 0,
    open_web_in_app: patch.openWebInApp === undefined ? undefined : patch.openWebInApp ? 1 : 0,
    agent_enabled: patch.agentEnabled === undefined ? undefined : patch.agentEnabled ? 1 : 0,
    highlight_today_column:
      patch.highlightTodayColumn === undefined ? undefined : patch.highlightTodayColumn ? 1 : 0,
    course_card_color_mode: patch.courseCardColorMode,
    course_card_unified_color: patch.courseCardUnifiedColor,
    semester_start_date: patch.semesterStartDate,
    timetable_bg_uri: patch.timetableBgUri,
  };
  for (const [col, val] of Object.entries(map)) {
    if (val !== undefined) {
      sets.push(`${col} = ?`);
      args.push(val);
    }
  }
  if (sets.length) {
    args.push(userId);
    await getPool().query(`UPDATE user_settings SET ${sets.join(", ")} WHERE user_id = ?`, args);
  }
  const row = await findSettingsByUserId(userId);
  if (!row) throw new Error("settings missing after upsert");
  return row;
}
