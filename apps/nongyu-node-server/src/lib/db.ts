import mysql, {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";
import { getEnv } from "../config/env.js";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;
  const env = getEnv();
  pool = mysql.createPool({
    host: env.MYSQL_HOST,
    port: env.MYSQL_PORT,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    // 客户端按 UTC 解释 DATETIME；须与库内 UTC 存储约定一致
    timezone: "Z",
    dateStrings: false,
    multipleStatements: true,
    connectTimeout: 30_000,
    enableKeepAlive: true,
  });
  // 会话时区 UTC：使 CURRENT_TIMESTAMP / ON UPDATE 与 UTC_TIMESTAMP 一致，避免东八区墙钟被当成 UTC 读出
  pool.on("connection", (connection) => {
    connection.query("SET time_zone = '+00:00'");
  });
  return pool;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function withTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export type { PoolConnection, ResultSetHeader, RowDataPacket };
