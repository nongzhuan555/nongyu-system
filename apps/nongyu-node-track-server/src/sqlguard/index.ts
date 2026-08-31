/** SQL 只读闸门，对齐 Go internal/sqlguard（词法级，非完整解析器）。 */

export const MaxSQLBytes = 8000;
export const MaxRows = 500;
const fetchLimit = MaxRows + 1;

export const ErrEmpty = new Error("sql is required");
export const ErrTooLong = new Error("sql exceeds 8000 bytes");
export const ErrMultiStmt = new Error("multiple statements are not allowed");
export const ErrNotSelect = new Error("only a single SELECT is allowed");
export const ErrForbidden = new Error("statement contains forbidden keywords");
export const ErrBadTable = new Error("query references a table that is not allowed");

const allowedTables = new Set(["events", "daily_metrics", "daily_dims", "user_presence"]);

const bannedKeywords = new Set([
  "insert",
  "update",
  "delete",
  "replace",
  "alter",
  "drop",
  "create",
  "attach",
  "detach",
  "vacuum",
  "reindex",
  "pragma",
  "into",
]);

const joinLeaders = new Set(["inner", "left", "right", "full", "cross", "outer", "natural"]);

const trailingKeywords = new Set([
  "on",
  "using",
  "where",
  "group",
  "order",
  "limit",
  "having",
  "union",
  "except",
  "intersect",
  "set",
  "join",
  "left",
  "right",
  "inner",
  "full",
  "cross",
  "outer",
  "natural",
  "as",
  "and",
  "or",
  "from",
  "select",
  "with",
  "window",
]);

export type Prepared = { execSQL: string };

function isErr(err: unknown, sentinel: Error): boolean {
  return err === sentinel || (err instanceof Error && err.message.startsWith(sentinel.message));
}

export function isSqlGuardError(err: unknown, sentinel: Error): boolean {
  if (err === sentinel) return true;
  if (!(err instanceof Error)) return false;
  if (err === sentinel) return true;
  // wrapped: "query references a table that is not allowed: meta_jobs"
  return err.message === sentinel.message || err.message.startsWith(`${sentinel.message}:`);
}

/** 校验只读 SELECT，并包一层 LIMIT 501。 */
export function prepare(raw: string): Prepared {
  if (raw.trim() === "") throw ErrEmpty;
  if (Buffer.byteLength(raw, "utf8") > MaxSQLBytes) throw ErrTooLong;

  let stripped = stripComments(raw).trim();
  if (!stripped) throw ErrEmpty;
  if (stripped.endsWith(";")) stripped = stripped.slice(0, -1).trim();
  if (stripped.includes(";")) throw ErrMultiStmt;

  const tokens = tokenize(stripped);
  if (tokens.length === 0) throw ErrEmpty;
  const first = tokens[0]!.toLowerCase();
  if (first !== "select" && first !== "with") throw ErrNotSelect;

  for (const tok of tokens) {
    if (bannedKeywords.has(tok.toLowerCase())) {
      throw new Error(`${ErrForbidden.message}: ${tok.toLowerCase()}`);
    }
  }

  const ctes = collectCTEs(tokens);
  const tables = extractTables(tokens);
  if (tables.length === 0) throw ErrBadTable;
  for (const table of tables) {
    const base = tableBase(table);
    if (ctes.has(base)) continue;
    if (!allowedTables.has(base)) {
      throw new Error(`${ErrBadTable.message}: ${base}`);
    }
  }

  return { execSQL: `SELECT * FROM (${stripped}) AS _ny_q LIMIT ${fetchLimit}` };
}

function tableBase(name: string): string {
  let n = name.toLowerCase().replace(/[`"[\]]/g, "");
  const i = n.lastIndexOf(".");
  if (i >= 0) n = n.slice(i + 1);
  return n;
}

function stripComments(sql: string): string {
  let out = "";
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i]!;
    if (ch === "'" || ch === '"') {
      const end = skipQuoted(sql, i);
      out += sql.slice(i, end);
      i = end;
      continue;
    }
    if (ch === "-" && sql[i + 1] === "-") {
      i += 2;
      while (i < sql.length && sql[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && sql[i + 1] === "*") {
      i += 2;
      let closed = false;
      while (i + 1 < sql.length) {
        if (sql[i] === "*" && sql[i + 1] === "/") {
          i += 2;
          closed = true;
          break;
        }
        i++;
      }
      if (!closed) throw new Error("unclosed block comment");
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function skipQuoted(sql: string, start: number): number {
  const q = sql[start]!;
  let i = start + 1;
  while (i < sql.length) {
    if (sql[i] === q) {
      if (sql[i + 1] === q) {
        i += 2;
        continue;
      }
      return i + 1;
    }
    i++;
  }
  throw new Error("unclosed string literal");
}

function tokenize(sql: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i]!;
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const end = skipQuoted(sql, i);
      tokens.push(sql.slice(i, end));
      i = end;
      continue;
    }
    if (isIdentStart(ch) || ch === "`") {
      let j = i + 1;
      while (j < sql.length && isIdentPart(sql[j]!)) j++;
      tokens.push(sql.slice(i, j));
      i = j;
      continue;
    }
    tokens.push(ch);
    i++;
  }
  return tokens;
}

function isIdentStart(b: string): boolean {
  return b === "_" || (b >= "A" && b <= "Z") || (b >= "a" && b <= "z");
}

function isIdentPart(b: string): boolean {
  return isIdentStart(b) || (b >= "0" && b <= "9") || b === "$";
}

function collectCTEs(tokens: string[]): Set<string> {
  const out = new Set<string>();
  if (tokens.length === 0 || tokens[0]!.toLowerCase() !== "with") return out;
  let i = 1;
  if (i < tokens.length && tokens[i]!.toLowerCase() === "recursive") i++;
  while (i < tokens.length) {
    const name = tableBase(tokens[i]!);
    i++;
    if (i < tokens.length && tokens[i]!.toLowerCase() === "as") i++;
    if (i >= tokens.length || tokens[i] !== "(") break;
    i = skipBalanced(tokens, i);
    out.add(name);
    if (i < tokens.length && tokens[i] === ",") {
      i++;
      continue;
    }
    break;
  }
  return out;
}

function skipBalanced(tokens: string[], i: number): number {
  let depth = 0;
  while (i < tokens.length) {
    if (tokens[i] === "(") depth++;
    else if (tokens[i] === ")") {
      depth--;
      if (depth === 0) return i + 1;
    }
    i++;
  }
  return i;
}

function extractTables(tokens: string[]): string[] {
  const tables: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const low = tokens[i]!.toLowerCase();
    if (low !== "from" && low !== "join") continue;
    const j = i + 1;
    if (j >= tokens.length) throw ErrBadTable;
    if (tokens[j] === "(") continue;
    const parsed = parseTableName(tokens, j);
    if (!parsed) throw ErrBadTable;
    tables.push(parsed.name);
    i = parsed.next - 1;
  }
  return tables;
}

function parseTableName(tokens: string[], j: number): { name: string; next: number } | null {
  if (j >= tokens.length) return null;
  if (joinLeaders.has(tokens[j]!.toLowerCase())) return null;
  const parts = [tokens[j]!];
  j++;
  if (j + 1 < tokens.length && tokens[j] === ".") {
    parts.push(tokens[j + 1]!);
    j += 2;
  }
  const name = parts.join(".");
  if (j < tokens.length && tokens[j]!.toLowerCase() === "as") {
    j++;
    if (j < tokens.length) j++;
  } else if (j < tokens.length) {
    const low = tokens[j]!.toLowerCase();
    const first = tokens[j]![0]!;
    if (isIdentStart(first) || first === "`") {
      if (!trailingKeywords.has(low) && !bannedKeywords.has(low)) j++;
    }
  }
  return { name, next: j };
}

void isErr;
