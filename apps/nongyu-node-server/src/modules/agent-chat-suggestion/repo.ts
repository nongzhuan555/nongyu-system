import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getPool } from "../../lib/db.js";

export type AgentChatSuggestionRow = {
  id: number;
  text: string;
  enabled: number;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
};

/** App：启用项按序最多 6 条 */
export async function listEnabledSuggestionsForApp(limit = 6): Promise<AgentChatSuggestionRow[]> {
  const [rows] = await getPool().query<(AgentChatSuggestionRow & RowDataPacket)[]>(
    `SELECT * FROM agent_chat_suggestions
     WHERE enabled = 1
     ORDER BY sort_order ASC, id ASC
     LIMIT ?`,
    [limit],
  );
  return rows;
}

export async function findSuggestionById(id: number): Promise<AgentChatSuggestionRow | null> {
  const [rows] = await getPool().query<(AgentChatSuggestionRow & RowDataPacket)[]>(
    `SELECT * FROM agent_chat_suggestions WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function listSuggestions(params: {
  enabled?: boolean;
  offset: number;
  pageSize: number;
}): Promise<{ rows: AgentChatSuggestionRow[]; total: number }> {
  const where: string[] = ["1=1"];
  const args: unknown[] = [];
  if (params.enabled !== undefined) {
    where.push("enabled = ?");
    args.push(params.enabled ? 1 : 0);
  }
  const whereSql = where.join(" AND ");
  const pool = getPool();
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM agent_chat_suggestions WHERE ${whereSql}`,
    args,
  );
  const [rows] = await pool.query<(AgentChatSuggestionRow & RowDataPacket)[]>(
    `SELECT * FROM agent_chat_suggestions
     WHERE ${whereSql}
     ORDER BY sort_order ASC, id ASC
     LIMIT ? OFFSET ?`,
    [...args, params.pageSize, params.offset],
  );
  return { rows, total: Number(countRows[0]?.c ?? 0) };
}

export async function insertSuggestion(input: {
  text: string;
  enabled: boolean;
  sortOrder: number;
}): Promise<number> {
  const [result] = await getPool().query<ResultSetHeader>(
    `INSERT INTO agent_chat_suggestions (text, enabled, sort_order) VALUES (?, ?, ?)`,
    [input.text, input.enabled ? 1 : 0, input.sortOrder],
  );
  return result.insertId;
}

export async function updateSuggestion(
  id: number,
  patch: { text?: string; enabled?: boolean; sortOrder?: number },
): Promise<void> {
  const sets: string[] = [];
  const args: unknown[] = [];
  if (patch.text !== undefined) {
    sets.push("text = ?");
    args.push(patch.text);
  }
  if (patch.enabled !== undefined) {
    sets.push("enabled = ?");
    args.push(patch.enabled ? 1 : 0);
  }
  if (patch.sortOrder !== undefined) {
    sets.push("sort_order = ?");
    args.push(patch.sortOrder);
  }
  if (!sets.length) return;
  args.push(id);
  await getPool().query(`UPDATE agent_chat_suggestions SET ${sets.join(", ")} WHERE id = ?`, args);
}

export async function deleteSuggestion(id: number): Promise<void> {
  await getPool().query(`DELETE FROM agent_chat_suggestions WHERE id = ?`, [id]);
}
