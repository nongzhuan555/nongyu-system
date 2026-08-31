import type { Store } from "./db.js";
import { nullIfEmpty } from "./db.js";

export type EventRow = {
  eventId: string;
  userId: number;
  studentNo: string;
  eventType: string;
  eventName: string;
  appVersion: string;
  platform: string;
  deviceBrand: string;
  sessionId: string;
  durationMs: number | null;
  propsJson: string;
  clientTsMs: number | null;
  receivedAtMs: number;
  statDate: string;
};

/** 幂等插入；duplicated=true 表示 UNIQUE(event_id) 命中。 */
export function insertEvent(store: Store, row: EventRow): boolean {
  const userId = row.userId > 0 ? row.userId : null;
  const result = store.db
    .prepare(
      `INSERT OR IGNORE INTO events (
  event_id, user_id, student_no, event_type, event_name, app_version, platform,
  device_brand, session_id, duration_ms, props_json, client_ts_ms, received_at_ms, stat_date
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      row.eventId,
      userId,
      nullIfEmpty(row.studentNo),
      row.eventType,
      row.eventName,
      nullIfEmpty(row.appVersion),
      nullIfEmpty(row.platform),
      nullIfEmpty(row.deviceBrand),
      nullIfEmpty(row.sessionId),
      row.durationMs,
      nullIfEmpty(row.propsJson),
      row.clientTsMs,
      row.receivedAtMs,
      row.statDate,
    );
  return result.changes === 0;
}
