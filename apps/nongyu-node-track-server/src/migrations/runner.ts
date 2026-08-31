import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";

function migrationsDir(): string {
  // 开发：src/migrations → ../../migrations；产物：dist → ./migrations
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [join(here, "..", "..", "migrations"), join(here, "migrations")];
  for (const c of candidates) {
    try {
      readFileSync(join(c, "001_init.sql"), "utf8");
      return c;
    } catch {
      /* try next */
    }
  }
  return join(here, "..", "..", "migrations");
}

function execSQL(db: Database.Database, script: string): void {
  for (const part of script.split(";")) {
    const stmt = part.trim();
    if (!stmt) continue;
    db.exec(stmt);
  }
}

const STEPS = [
  { id: "001_init", file: "001_init.sql" },
  { id: "002_llm_proxy_fail", file: "002_llm_proxy_fail.sql" },
  { id: "003_platform_web", file: "003_platform_web.sql" },
] as const;

/** 启动时跑 schema_migrations，与 Go 迁移 id 对齐。 */
export function applyMigrations(db: Database.Database): void {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY)");
  const dir = migrationsDir();
  const exists = db.prepare("SELECT COUNT(*) AS n FROM schema_migrations WHERE id=?");
  const insert = db.prepare("INSERT INTO schema_migrations(id) VALUES (?)");

  for (const step of STEPS) {
    const row = exists.get(step.id) as { n: number };
    if (row.n > 0) continue;
    const sql = readFileSync(join(dir, step.file), "utf8");
    const tx = db.transaction(() => {
      execSQL(db, sql);
      insert.run(step.id);
    });
    tx();
  }
}
