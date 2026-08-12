import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getPool } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, "../../migrations");

export async function runMigrations() {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT NOT NULL AUTO_INCREMENT,
      filename VARCHAR(255) NOT NULL,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY uk_schema_migrations_filename (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const files = (await fs.readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 1 AS ok FROM schema_migrations WHERE filename = ? LIMIT 1`,
      [file],
    );
    if (rows.length) continue;

    let sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    sql = sql.replace(
      /CREATE TABLE IF NOT EXISTS schema_migrations[\s\S]*?utf8mb4_unicode_ci;\s*/i,
      "",
    );

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(sql);
      await conn.query<ResultSetHeader>(`INSERT INTO schema_migrations (filename) VALUES (?)`, [
        file,
      ]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}
