import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getPool } from "../../lib/db.js";

export type RuntimeConfigRow = {
  id: number;
  track_sample_rate: number;
  updated_at: Date;
  updated_by: number | null;
};

/** 读取埋点采样率；无行时视为 100（表默认行保证） */
export async function getTrackSampleRate(): Promise<number> {
  const [rows] = await getPool().query<(RuntimeConfigRow & RowDataPacket)[]>(
    `SELECT id, track_sample_rate, updated_at, updated_by FROM app_runtime_config WHERE id = 1 LIMIT 1`,
  );
  const rate = rows[0]?.track_sample_rate;
  if (rate === undefined || rate === null) return 100;
  return Number(rate);
}

/** 写入埋点采样率（幂等 upsert 到 id=1） */
export async function setTrackSampleRate(
  sampleRate: number,
  updatedBy: number | null,
): Promise<number> {
  await getPool().query<ResultSetHeader>(
    `INSERT INTO app_runtime_config (id, track_sample_rate, updated_at, updated_by)
     VALUES (1, ?, UTC_TIMESTAMP(3), ?)
     ON DUPLICATE KEY UPDATE
       track_sample_rate = VALUES(track_sample_rate),
       updated_at = UTC_TIMESTAMP(3),
       updated_by = VALUES(updated_by)`,
    [sampleRate, updatedBy],
  );
  return sampleRate;
}
