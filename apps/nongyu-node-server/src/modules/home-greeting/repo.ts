import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getPool, withTransaction } from "../../lib/db.js";

export type HomeGreetingRow = {
  id: number;
  message: string;
  enabled: number;
  created_at: Date;
  updated_at: Date;
};

export async function findEnabledGreeting(): Promise<HomeGreetingRow | null> {
  const [rows] = await getPool().query<(HomeGreetingRow & RowDataPacket)[]>(
    `SELECT * FROM home_greetings WHERE enabled = 1 ORDER BY id DESC LIMIT 1`,
  );
  return rows[0] ?? null;
}

export async function findGreetingById(id: number): Promise<HomeGreetingRow | null> {
  const [rows] = await getPool().query<(HomeGreetingRow & RowDataPacket)[]>(
    `SELECT * FROM home_greetings WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function listGreetings(params: {
  enabled?: boolean;
  offset: number;
  pageSize: number;
}): Promise<{ rows: HomeGreetingRow[]; total: number }> {
  const where: string[] = ["1=1"];
  const args: unknown[] = [];
  if (params.enabled !== undefined) {
    where.push("enabled = ?");
    args.push(params.enabled ? 1 : 0);
  }
  const whereSql = where.join(" AND ");
  const pool = getPool();
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM home_greetings WHERE ${whereSql}`,
    args,
  );
  const [rows] = await pool.query<(HomeGreetingRow & RowDataPacket)[]>(
    `SELECT * FROM home_greetings WHERE ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...args, params.pageSize, params.offset],
  );
  return { rows, total: Number(countRows[0]?.c ?? 0) };
}

async function disableAll(conn: PoolConnection): Promise<void> {
  await conn.query(`UPDATE home_greetings SET enabled = 0 WHERE enabled = 1`);
}

export async function insertGreeting(input: {
  message: string;
  enabled: boolean;
}): Promise<number> {
  return withTransaction(async (conn) => {
    if (input.enabled) {
      await disableAll(conn);
    }
    const [result] = await conn.query<ResultSetHeader>(
      `INSERT INTO home_greetings (message, enabled) VALUES (?, ?)`,
      [input.message, input.enabled ? 1 : 0],
    );
    return result.insertId;
  });
}

export async function updateGreeting(
  id: number,
  patch: { message?: string; enabled?: boolean },
): Promise<void> {
  await withTransaction(async (conn) => {
    if (patch.enabled === true) {
      await disableAll(conn);
    }
    const sets: string[] = [];
    const args: unknown[] = [];
    if (patch.message !== undefined) {
      sets.push("message = ?");
      args.push(patch.message);
    }
    if (patch.enabled !== undefined) {
      sets.push("enabled = ?");
      args.push(patch.enabled ? 1 : 0);
    }
    if (!sets.length) return;
    args.push(id);
    await conn.query(`UPDATE home_greetings SET ${sets.join(", ")} WHERE id = ?`, args);
  });
}

export async function deleteGreeting(id: number): Promise<void> {
  await getPool().query(`DELETE FROM home_greetings WHERE id = ?`, [id]);
}
