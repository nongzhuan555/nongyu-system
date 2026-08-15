import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getPool } from "../../lib/db.js";
import type { CourseShareRow } from "./mapper.js";

export async function findShareByUserId(userId: number): Promise<CourseShareRow | null> {
  const [rows] = await getPool().query<(CourseShareRow & RowDataPacket)[]>(
    `SELECT user_id, student_no, share_enabled, courses_json, updated_at
     FROM course_share_snapshots WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
}

export async function findShareByStudentNo(studentNo: string): Promise<CourseShareRow | null> {
  const [rows] = await getPool().query<(CourseShareRow & RowDataPacket)[]>(
    `SELECT user_id, student_no, share_enabled, courses_json, updated_at
     FROM course_share_snapshots WHERE student_no = ? LIMIT 1`,
    [studentNo],
  );
  return rows[0] ?? null;
}

/**
 * 开启或覆盖共享快照
 */
export async function upsertShareEnabled(
  userId: number,
  studentNo: string,
  coursesJson: string,
): Promise<CourseShareRow> {
  await getPool().query<ResultSetHeader>(
    `INSERT INTO course_share_snapshots (user_id, student_no, share_enabled, courses_json)
     VALUES (?, ?, 1, CAST(? AS JSON))
     ON DUPLICATE KEY UPDATE
       student_no = VALUES(student_no),
       share_enabled = 1,
       courses_json = VALUES(courses_json),
       updated_at = CURRENT_TIMESTAMP(3)`,
    [userId, studentNo, coursesJson],
  );
  const row = await findShareByUserId(userId);
  if (!row) throw new Error("upsertShareEnabled: row missing after write");
  return row;
}

/**
 * 关闭共享并清空 JSON
 */
export async function upsertShareDisabled(
  userId: number,
  studentNo: string,
): Promise<CourseShareRow> {
  await getPool().query<ResultSetHeader>(
    `INSERT INTO course_share_snapshots (user_id, student_no, share_enabled, courses_json)
     VALUES (?, ?, 0, NULL)
     ON DUPLICATE KEY UPDATE
       student_no = VALUES(student_no),
       share_enabled = 0,
       courses_json = NULL,
       updated_at = CURRENT_TIMESTAMP(3)`,
    [userId, studentNo],
  );
  const row = await findShareByUserId(userId);
  if (!row) throw new Error("upsertShareDisabled: row missing after write");
  return row;
}
