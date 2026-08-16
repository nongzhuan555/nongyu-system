import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getPool } from "../../lib/db.js";

export type LlmApiKeyRow = {
  id: number;
  name: string;
  provider: string;
  account_group: string;
  api_key_cipher: string;
  api_key_suffix: string;
  base_url: string | null;
  model: string | null;
  max_concurrent: number;
  weight: number;
  status: number;
  success_count: number;
  fail_count: number;
  last_used_at: Date | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
};

export async function listLlmKeys(params: {
  status?: number;
  accountGroup?: string;
  offset: number;
  pageSize: number;
}): Promise<{ rows: LlmApiKeyRow[]; total: number }> {
  const where: string[] = ["1=1"];
  const args: unknown[] = [];
  if (params.status !== undefined) {
    where.push("status = ?");
    args.push(params.status);
  }
  if (params.accountGroup) {
    where.push("account_group = ?");
    args.push(params.accountGroup);
  }
  const whereSql = where.join(" AND ");
  const pool = getPool();
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM llm_api_keys WHERE ${whereSql}`,
    args,
  );
  const [rows] = await pool.query<(LlmApiKeyRow & RowDataPacket)[]>(
    `SELECT * FROM llm_api_keys WHERE ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...args, params.pageSize, params.offset],
  );
  return { rows, total: Number(countRows[0]?.c ?? 0) };
}

export async function findLlmKeyById(id: number): Promise<LlmApiKeyRow | null> {
  const [rows] = await getPool().query<(LlmApiKeyRow & RowDataPacket)[]>(
    `SELECT * FROM llm_api_keys WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

/** 凡 status=1 的 Key 均可调度（不按 provider / model 过滤） */
export async function listEnabledPoolKeys(): Promise<LlmApiKeyRow[]> {
  const [rows] = await getPool().query<(LlmApiKeyRow & RowDataPacket)[]>(
    `SELECT * FROM llm_api_keys WHERE status = 1 ORDER BY id ASC`,
  );
  return rows;
}

export async function insertLlmKey(input: {
  name: string;
  provider: string;
  accountGroup: string;
  apiKeyCipher: string;
  apiKeySuffix: string;
  baseUrl: string | null;
  model: string | null;
  maxConcurrent: number;
  weight: number;
  status: number;
}): Promise<number> {
  const [result] = await getPool().query<ResultSetHeader>(
    `INSERT INTO llm_api_keys (
      name, provider, account_group, api_key_cipher, api_key_suffix,
      base_url, model, max_concurrent, weight, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.provider,
      input.accountGroup,
      input.apiKeyCipher,
      input.apiKeySuffix,
      input.baseUrl,
      input.model,
      input.maxConcurrent,
      input.weight,
      input.status,
    ],
  );
  return result.insertId;
}

export async function updateLlmKey(
  id: number,
  patch: Partial<{
    name: string;
    accountGroup: string;
    apiKeyCipher: string;
    apiKeySuffix: string;
    baseUrl: string | null;
    model: string | null;
    maxConcurrent: number;
    weight: number;
    status: number;
  }>,
): Promise<void> {
  const sets: string[] = [];
  const args: unknown[] = [];
  if (patch.name !== undefined) {
    sets.push("name = ?");
    args.push(patch.name);
  }
  if (patch.accountGroup !== undefined) {
    sets.push("account_group = ?");
    args.push(patch.accountGroup);
  }
  if (patch.apiKeyCipher !== undefined) {
    sets.push("api_key_cipher = ?");
    args.push(patch.apiKeyCipher);
  }
  if (patch.apiKeySuffix !== undefined) {
    sets.push("api_key_suffix = ?");
    args.push(patch.apiKeySuffix);
  }
  if (patch.baseUrl !== undefined) {
    sets.push("base_url = ?");
    args.push(patch.baseUrl);
  }
  if (patch.model !== undefined) {
    sets.push("model = ?");
    args.push(patch.model);
  }
  if (patch.maxConcurrent !== undefined) {
    sets.push("max_concurrent = ?");
    args.push(patch.maxConcurrent);
  }
  if (patch.weight !== undefined) {
    sets.push("weight = ?");
    args.push(patch.weight);
  }
  if (patch.status !== undefined) {
    sets.push("status = ?");
    args.push(patch.status);
  }
  if (sets.length === 0) return;
  args.push(id);
  await getPool().query(`UPDATE llm_api_keys SET ${sets.join(", ")} WHERE id = ?`, args);
}

export async function deleteLlmKey(id: number): Promise<void> {
  await getPool().query(`DELETE FROM llm_api_keys WHERE id = ?`, [id]);
}

export async function bumpKeyStats(
  id: number,
  kind: "success" | "fail",
  lastError: string | null,
): Promise<void> {
  if (kind === "success") {
    await getPool().query(
      `UPDATE llm_api_keys
       SET success_count = success_count + 1,
           last_used_at = UTC_TIMESTAMP(3),
           last_error = NULL
       WHERE id = ?`,
      [id],
    );
    return;
  }
  await getPool().query(
    `UPDATE llm_api_keys
     SET fail_count = fail_count + 1,
         last_used_at = UTC_TIMESTAMP(3),
         last_error = ?
     WHERE id = ?`,
    [lastError?.slice(0, 255) ?? null, id],
  );
}

export async function getUserDailyCount(userId: number, usageDate: string): Promise<number> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT request_count AS c FROM llm_user_usage_daily WHERE user_id = ? AND usage_date = ? LIMIT 1`,
    [userId, usageDate],
  );
  return Number(rows[0]?.c ?? 0);
}

export async function incrementUserDailyCount(userId: number, usageDate: string): Promise<number> {
  await getPool().query(
    `INSERT INTO llm_user_usage_daily (user_id, usage_date, request_count)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE request_count = request_count + 1`,
    [userId, usageDate],
  );
  return getUserDailyCount(userId, usageDate);
}
