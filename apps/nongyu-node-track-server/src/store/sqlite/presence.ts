import type { Store } from "./db.js";
import { nullIfEmpty } from "./db.js";

export type Presence = {
  userId: number;
  online: boolean;
  lastSeenAtMs: number;
  platform: string;
  appVersion: string;
  deviceBrand: string;
  updatedAtMs: number;
};

export function upsertPresence(store: Store, p: Presence): void {
  store.db
    .prepare(
      `INSERT INTO user_presence (user_id, is_online, last_seen_at_ms, platform, app_version, device_brand, updated_at_ms)
VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(user_id) DO UPDATE SET
  is_online=excluded.is_online,
  last_seen_at_ms=excluded.last_seen_at_ms,
  platform=excluded.platform,
  app_version=excluded.app_version,
  device_brand=excluded.device_brand,
  updated_at_ms=excluded.updated_at_ms`,
    )
    .run(
      p.userId,
      p.online ? 1 : 0,
      p.lastSeenAtMs,
      nullIfEmpty(p.platform),
      nullIfEmpty(p.appVersion),
      nullIfEmpty(p.deviceBrand),
      p.updatedAtMs,
    );
}

export function listTimedOut(store: Store, cutoffMs: number): number[] {
  const rows = store.db
    .prepare(`SELECT user_id FROM user_presence WHERE is_online=1 AND last_seen_at_ms < ?`)
    .all(cutoffMs) as Array<{ user_id: number }>;
  return rows.map((r) => r.user_id);
}

export function countOnline(store: Store): number {
  const row = store.db
    .prepare(`SELECT COUNT(*) AS n FROM user_presence WHERE is_online=1`)
    .get() as { n: number };
  return row.n;
}
