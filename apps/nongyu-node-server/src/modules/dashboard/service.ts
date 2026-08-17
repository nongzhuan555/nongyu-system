import type { RowDataPacket } from "mysql2/promise";
import { getPool } from "../../lib/db.js";
import { getEnv } from "../../config/env.js";
import { businessDayUtcRange, eachBusinessDateKeys } from "../../lib/time.js";
import { ONLINE_FRESH_WINDOW_SEC, clearStaleOnlineUsers } from "../users/repo.js";

export async function getOverview() {
  const tz = getEnv().BUSINESS_TZ;
  const { start, end } = businessDayUtcRange(tz);
  // Track 离线回写失败时 is_online 会永久为 1；读大屏前按心跳窗口收敛
  await clearStaleOnlineUsers(ONLINE_FRESH_WINDOW_SEC);
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
      (SELECT COUNT(*) FROM users) AS totalUsers,
      (SELECT COUNT(*) FROM users WHERE role = 1) AS totalAdmins,
      (SELECT COUNT(*) FROM users
         WHERE is_online = 1
           AND last_active_at IS NOT NULL
           AND last_active_at >= (UTC_TIMESTAMP(3) - INTERVAL ? SECOND)
      ) AS onlineUsers,
      (SELECT COUNT(*) FROM users WHERE created_at >= ? AND created_at < ?) AS todayNewUsers`,
    [ONLINE_FRESH_WINDOW_SEC, start, end],
  );
  const r = rows[0];
  return {
    totalUsers: Number(r.totalUsers),
    totalAdmins: Number(r.totalAdmins),
    onlineUsers: Number(r.onlineUsers),
    todayNewUsers: Number(r.todayNewUsers),
  };
}

export async function getUserGrowth(range: "7d" | "30d" | "90d" | "180d" | "365d") {
  const days = Number(range.replace("d", ""));
  const tz = getEnv().BUSINESS_TZ;
  const dateKeys = eachBusinessDateKeys(tz, days);
  const startKey = dateKeys[0];
  const start = businessDayUtcRange(tz, new Date(`${startKey}T12:00:00Z`)).start;

  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT DATE(CONVERT_TZ(created_at, '+00:00', ?)) AS d, COUNT(*) AS c
     FROM users
     WHERE created_at >= ?
     GROUP BY d
     ORDER BY d ASC`,
    [tzOffsetMysql(tz), start],
  );

  const map = new Map<string, number>();
  for (const row of rows) {
    const key =
      typeof row.d === "string"
        ? row.d.slice(0, 10)
        : row.d instanceof Date
          ? row.d.toISOString().slice(0, 10)
          : String(row.d);
    map.set(key, Number(row.c));
  }

  return {
    points: dateKeys.map((date) => ({
      date,
      newUsers: map.get(date) ?? 0,
    })),
  };
}

function tzOffsetMysql(tz: string): string {
  // CONVERT_TZ named zones need mysql timezone tables; use fixed offset for Asia/Shanghai
  if (tz === "Asia/Shanghai" || tz === "Asia/Chongqing") return "+08:00";
  return "+00:00";
}

async function groupCount(sql: string): Promise<{ key: string; count: number }[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(sql);
  return rows.map((r) => ({
    key: r.key == null || r.key === "" ? "unknown" : String(r.key),
    count: Number(r.count),
  }));
}

export async function getUserDistribution() {
  const [gender, campus, college, grade, deviceBrand] = await Promise.all([
    groupCount(
      `SELECT CASE gender WHEN 1 THEN 'male' WHEN 2 THEN 'female' ELSE 'unknown' END AS \`key\`, COUNT(*) AS count
       FROM users GROUP BY gender`,
    ),
    groupCount(
      `SELECT COALESCE(NULLIF(campus, ''), 'unknown') AS \`key\`, COUNT(*) AS count FROM users GROUP BY campus`,
    ),
    groupCount(
      `SELECT COALESCE(NULLIF(college, ''), 'unknown') AS \`key\`, COUNT(*) AS count FROM users GROUP BY college`,
    ),
    groupCount(
      `SELECT COALESCE(NULLIF(grade, ''), 'unknown') AS \`key\`, COUNT(*) AS count FROM users GROUP BY grade`,
    ),
    groupCount(
      `SELECT COALESCE(NULLIF(device_brand, ''), 'unknown') AS \`key\`, COUNT(*) AS count FROM users GROUP BY device_brand`,
    ),
  ]);
  return { gender, campus, college, grade, deviceBrand };
}

export async function getSettingsDistribution() {
  const [theme, homeIsTimetable, openWebInApp, agentEnabled] = await Promise.all([
    groupCount(`SELECT theme AS \`key\`, COUNT(*) AS count FROM user_settings GROUP BY theme`),
    groupCount(
      `SELECT IF(home_is_timetable = 1, 'true', 'false') AS \`key\`, COUNT(*) AS count FROM user_settings GROUP BY home_is_timetable`,
    ),
    groupCount(
      `SELECT IF(open_web_in_app = 1, 'true', 'false') AS \`key\`, COUNT(*) AS count FROM user_settings GROUP BY open_web_in_app`,
    ),
    groupCount(
      `SELECT IF(agent_enabled = 1, 'true', 'false') AS \`key\`, COUNT(*) AS count FROM user_settings GROUP BY agent_enabled`,
    ),
  ]);
  return { theme, homeIsTimetable, openWebInApp, agentEnabled };
}
