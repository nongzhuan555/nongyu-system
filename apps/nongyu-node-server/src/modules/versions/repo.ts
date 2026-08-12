import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getPool } from "../../lib/db.js";

export type VersionRow = {
  id: number;
  platform: "ios" | "android" | "all";
  version_name: string;
  version_code: number;
  release_channel: "silent_ota" | "native";
  force_update: number;
  download_url: string | null;
  changelog: string | null;
  is_published: number;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export async function findLatestPublished(platform: "ios" | "android"): Promise<VersionRow | null> {
  const [rows] = await getPool().query<(VersionRow & RowDataPacket)[]>(
    `SELECT * FROM app_versions
     WHERE is_published = 1 AND platform IN (?, 'all')
     ORDER BY version_code DESC
     LIMIT 1`,
    [platform],
  );
  return rows[0] ?? null;
}

export async function findVersionById(id: number): Promise<VersionRow | null> {
  const [rows] = await getPool().query<(VersionRow & RowDataPacket)[]>(
    `SELECT * FROM app_versions WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function listVersions(params: {
  platform?: string;
  isPublished?: boolean;
  offset: number;
  pageSize: number;
}): Promise<{ rows: VersionRow[]; total: number }> {
  const where: string[] = ["1=1"];
  const args: unknown[] = [];
  if (params.platform) {
    where.push("platform = ?");
    args.push(params.platform);
  }
  if (params.isPublished !== undefined) {
    where.push("is_published = ?");
    args.push(params.isPublished ? 1 : 0);
  }
  const whereSql = where.join(" AND ");
  const pool = getPool();
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM app_versions WHERE ${whereSql}`,
    args,
  );
  const [rows] = await pool.query<(VersionRow & RowDataPacket)[]>(
    `SELECT * FROM app_versions WHERE ${whereSql} ORDER BY version_code DESC LIMIT ? OFFSET ?`,
    [...args, params.pageSize, params.offset],
  );
  return { rows, total: Number(countRows[0]?.c ?? 0) };
}

export async function insertVersion(input: {
  platform: string;
  versionName: string;
  versionCode: number;
  releaseChannel: string;
  forceUpdate: boolean;
  downloadUrl: string | null;
  changelog: string | null;
  isPublished: boolean;
}): Promise<number> {
  const [result] = await getPool().query<ResultSetHeader>(
    `INSERT INTO app_versions (
      platform, version_name, version_code, release_channel, force_update,
      download_url, changelog, is_published, published_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, IF(?, UTC_TIMESTAMP(3), NULL))`,
    [
      input.platform,
      input.versionName,
      input.versionCode,
      input.releaseChannel,
      input.forceUpdate ? 1 : 0,
      input.downloadUrl,
      input.changelog,
      input.isPublished ? 1 : 0,
      input.isPublished ? 1 : 0,
    ],
  );
  return result.insertId;
}

export async function updateVersion(
  id: number,
  patch: Partial<{
    platform: string;
    versionName: string;
    versionCode: number;
    releaseChannel: string;
    forceUpdate: boolean;
    downloadUrl: string | null;
    changelog: string | null;
    isPublished: boolean;
  }>,
): Promise<void> {
  const sets: string[] = [];
  const args: unknown[] = [];
  if (patch.platform !== undefined) {
    sets.push("platform = ?");
    args.push(patch.platform);
  }
  if (patch.versionName !== undefined) {
    sets.push("version_name = ?");
    args.push(patch.versionName);
  }
  if (patch.versionCode !== undefined) {
    sets.push("version_code = ?");
    args.push(patch.versionCode);
  }
  if (patch.releaseChannel !== undefined) {
    sets.push("release_channel = ?");
    args.push(patch.releaseChannel);
  }
  if (patch.forceUpdate !== undefined) {
    sets.push("force_update = ?");
    args.push(patch.forceUpdate ? 1 : 0);
  }
  if (patch.downloadUrl !== undefined) {
    sets.push("download_url = ?");
    args.push(patch.downloadUrl);
  }
  if (patch.changelog !== undefined) {
    sets.push("changelog = ?");
    args.push(patch.changelog);
  }
  if (patch.isPublished !== undefined) {
    sets.push("is_published = ?");
    args.push(patch.isPublished ? 1 : 0);
    if (patch.isPublished) {
      sets.push("published_at = COALESCE(published_at, UTC_TIMESTAMP(3))");
    }
  }
  if (!sets.length) return;
  args.push(id);
  await getPool().query(`UPDATE app_versions SET ${sets.join(", ")} WHERE id = ?`, args);
}

/** Recommended: unpublish only */
export async function unpublishVersion(id: number): Promise<void> {
  await getPool().query(`UPDATE app_versions SET is_published = 0 WHERE id = ?`, [id]);
}
