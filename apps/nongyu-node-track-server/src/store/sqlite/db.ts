import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { applyMigrations } from "../../migrations/runner.js";

export type Store = {
  db: Database.Database;
  close: () => void;
  ping: () => void;
  withWriteTx: <T>(fn: () => T) => T;
};

const WRITE_PRAGMAS = [
  "PRAGMA journal_mode=WAL",
  "PRAGMA synchronous=NORMAL",
  "PRAGMA busy_timeout=5000",
  "PRAGMA foreign_keys=ON",
  "PRAGMA temp_store=MEMORY",
  "PRAGMA cache_size=-20000",
  "PRAGMA mmap_size=67108864",
];

export function openStore(dbPath: string): Store {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  for (const p of WRITE_PRAGMAS) {
    db.exec(p);
  }
  applyMigrations(db);

  return {
    db,
    close: () => {
      db.close();
    },
    ping: () => {
      db.prepare("SELECT 1").get();
    },
    withWriteTx: <T>(fn: () => T): T => {
      const run = db.transaction(fn);
      return run();
    },
  };
}

export function nullIfEmpty(s: string): string | null {
  return s === "" ? null : s;
}
