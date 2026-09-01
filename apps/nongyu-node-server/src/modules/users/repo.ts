import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getPool, type PoolConnection } from "../../lib/db.js";

export type UserRow = {
  id: number;
  student_no: string;
  name: string;
  major: string | null;
  college: string | null;
  class_name: string | null;
  grade: string | null;
  gender: 0 | 1 | 2;
  hometown: string | null;
  campus: string | null;
  qq: string | null;
  role: 0 | 1 | 2;
  admin_password_hash: string | null;
  status: 0 | 1;
  is_online: number;
  last_active_at: Date | null;
  last_login_at: Date | null;
  device_brand: string | null;
  device_model: string | null;
  device_os: string | null;
  current_device_id: string | null;
  token_version: number;
  created_at: Date;
  updated_at: Date;
};

const USER_COLS = `id, student_no, name, major, college, class_name, grade, gender, hometown, campus, qq,
  role, admin_password_hash, status, is_online, last_active_at, last_login_at,
  device_brand, device_model, device_os, current_device_id, token_version, created_at, updated_at`;

export async function findUserById(id: number, conn?: PoolConnection): Promise<UserRow | null> {
  const db = conn ?? getPool();
  const [rows] = await db.query<(UserRow & RowDataPacket)[]>(
    `SELECT ${USER_COLS} FROM users WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function findUserByStudentNo(
  studentNo: string,
  conn?: PoolConnection,
): Promise<UserRow | null> {
  const db = conn ?? getPool();
  const [rows] = await db.query<(UserRow & RowDataPacket)[]>(
    `SELECT ${USER_COLS} FROM users WHERE student_no = ? LIMIT 1`,
    [studentNo],
  );
  return rows[0] ?? null;
}

export type InsertUserInput = {
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
  deviceId: string;
  deviceBrand: string | null;
  deviceModel: string | null;
  deviceOs: string | null;
};

export async function insertUser(input: InsertUserInput, conn: PoolConnection): Promise<number> {
  const [result] = await conn.query<ResultSetHeader>(
    `INSERT INTO users (
      student_no, name, major, college, class_name, grade, gender, hometown, campus, qq,
      is_online, last_active_at, last_login_at, device_brand, device_model, device_os,
      current_device_id, token_version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3), ?, ?, ?, ?, 1)`,
    [
      input.studentNo,
      input.name,
      input.major,
      input.college,
      input.className,
      input.grade,
      input.gender,
      input.hometown,
      input.campus,
      input.qq,
      input.deviceBrand,
      input.deviceModel,
      input.deviceOs,
      input.deviceId,
    ],
  );
  return result.insertId;
}

export async function updateUserOnAppLogin(
  id: number,
  input: {
    name: string;
    major: string | null;
    college: string | null;
    className: string | null;
    grade: string | null;
    gender: 0 | 1 | 2;
    hometown: string | null;
    campus: string | null;
    keepQq: string | null;
    deviceId: string;
    deviceBrand: string | null;
    deviceModel: string | null;
    deviceOs: string | null;
    /** 换设备时为 true；同设备再登录为 false */
    bumpTokenVersion: boolean;
  },
  conn: PoolConnection,
): Promise<void> {
  const versionSql = input.bumpTokenVersion
    ? "token_version = token_version + 1"
    : "token_version = token_version";
  await conn.query(
    `UPDATE users SET
      name = ?, major = ?, college = ?, class_name = ?, grade = ?, gender = ?,
      hometown = ?, campus = ?,
      qq = ?,
      is_online = 1,
      last_active_at = UTC_TIMESTAMP(3),
      last_login_at = UTC_TIMESTAMP(3),
      device_brand = ?, device_model = ?, device_os = ?,
      current_device_id = ?,
      ${versionSql}
    WHERE id = ?`,
    [
      input.name,
      input.major,
      input.college,
      input.className,
      input.grade,
      input.gender,
      input.hometown,
      input.campus,
      input.keepQq,
      input.deviceBrand,
      input.deviceModel,
      input.deviceOs,
      input.deviceId,
      id,
    ],
  );
}

export async function setUserRole(
  id: number,
  role: 0 | 1 | 2,
  conn?: PoolConnection,
): Promise<void> {
  const db = conn ?? getPool();
  await db.query(`UPDATE users SET role = ? WHERE id = ?`, [role, id]);
}

export async function logoutAppUser(id: number): Promise<void> {
  await getPool().query(
    `UPDATE users SET is_online = 0, token_version = token_version + 1 WHERE id = ?`,
    [id],
  );
}

export async function updateUserQq(id: number, qq: string | null): Promise<void> {
  await getPool().query(`UPDATE users SET qq = ? WHERE id = ?`, [qq, id]);
}

export async function updateUserPresence(
  id: number,
  isOnline: 0 | 1,
  lastActiveAt: Date,
): Promise<boolean> {
  const user = await findUserById(id);
  if (!user) return false;
  await getPool().query(`UPDATE users SET is_online = ?, last_active_at = ? WHERE id = ?`, [
    isOnline,
    lastActiveAt,
    id,
  ]);
  return true;
}

/** 与 Track `PRESENCE_OFFLINE_AFTER_MS` 默认 10 分钟对齐 */
export const ONLINE_FRESH_WINDOW_SEC = 600;

/**
 * 将「标在线但已超过心跳窗口」的用户清为离线。
 * Track→Node 回写失败时，仅靠 is_online 位会永久卡住。
 */
export async function clearStaleOnlineUsers(
  freshWindowSec: number = ONLINE_FRESH_WINDOW_SEC,
): Promise<number> {
  const [result] = await getPool().query<ResultSetHeader>(
    `UPDATE users
     SET is_online = 0
     WHERE is_online = 1
       AND (
         last_active_at IS NULL
         OR last_active_at < (UTC_TIMESTAMP(3) - INTERVAL ? SECOND)
       )`,
    [freshWindowSec],
  );
  return Number(result.affectedRows ?? 0);
}

export async function listUsersAdmin(params: {
  offset: number;
  pageSize: number;
  keyword?: string;
  role?: number;
  status?: number;
  /** 仅 `1`：当前在线（须与大屏口径一致，调用方先 clearStale） */
  isOnline?: 1;
}): Promise<{ rows: UserRow[]; total: number }> {
  const where: string[] = ["1=1"];
  const args: unknown[] = [];
  if (params.keyword) {
    where.push("(student_no LIKE ? OR name LIKE ?)");
    args.push(`%${params.keyword}%`, `%${params.keyword}%`);
  }
  if (params.role !== undefined) {
    where.push("role = ?");
    args.push(params.role);
  }
  if (params.status !== undefined) {
    where.push("status = ?");
    args.push(params.status);
  }
  if (params.isOnline === 1) {
    where.push(
      "is_online = 1 AND last_active_at IS NOT NULL AND last_active_at >= (UTC_TIMESTAMP(3) - INTERVAL ? SECOND)",
    );
    args.push(ONLINE_FRESH_WINDOW_SEC);
  }
  const whereSql = where.join(" AND ");
  const pool = getPool();
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM users WHERE ${whereSql}`,
    args,
  );
  const [rows] = await pool.query<(UserRow & RowDataPacket)[]>(
    `SELECT ${USER_COLS} FROM users WHERE ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...args, params.pageSize, params.offset],
  );
  return { rows, total: Number(countRows[0]?.c ?? 0) };
}

export async function patchUserAdmin(
  id: number,
  patch: { role?: 0 | 1; status?: 0 | 1 },
): Promise<void> {
  const sets: string[] = [];
  const args: unknown[] = [];
  if (patch.role !== undefined) {
    sets.push("role = ?");
    args.push(patch.role);
    if (patch.role === 0) {
      sets.push("admin_password_hash = NULL");
    }
  }
  if (patch.status !== undefined) {
    sets.push("status = ?");
    args.push(patch.status);
  }
  if (!sets.length) return;
  args.push(id);
  await getPool().query(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, args);
}

export async function setAdminPasswordHash(id: number, hash: string): Promise<void> {
  await getPool().query(`UPDATE users SET admin_password_hash = ? WHERE id = ?`, [hash, id]);
}

export async function countUsers(): Promise<number> {
  const [rows] = await getPool().query<RowDataPacket[]>(`SELECT COUNT(*) AS c FROM users`);
  return Number(rows[0]?.c ?? 0);
}
