import type { Store } from "./db.js";

const queryTimeoutMs = 8000;

/** 在连接上执行已校验 SQL，最多返回 maxRows 行。 */
export function queryReadOnly(
  store: Store,
  query: string,
  maxRows: number,
): { columns: string[]; rows: Array<Record<string, unknown>>; truncated: boolean } {
  const lim = maxRows < 1 ? 1 : maxRows;
  const started = Date.now();
  const stmt = store.db.prepare(query);
  const all = stmt.all() as Array<Record<string, unknown>>;
  if (Date.now() - started > queryTimeoutMs) {
    const err = new Error("query timed out");
    (err as Error & { code?: string }).code = "TIMEOUT";
    throw err;
  }
  const columns = stmt.columns().map((c) => c.name);
  const rowsOut: Array<Record<string, unknown>> = [];
  let truncated = false;
  for (const row of all) {
    if (rowsOut.length >= lim) {
      truncated = true;
      break;
    }
    const item: Record<string, unknown> = {};
    for (const col of columns) {
      item[col] = jsonCell(row[col]);
    }
    rowsOut.push(item);
  }
  return { columns, rows: rowsOut, truncated };
}

function jsonCell(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (Buffer.isBuffer(v)) return v.toString("utf8");
  if (v instanceof Date) return v.toISOString();
  return v;
}
