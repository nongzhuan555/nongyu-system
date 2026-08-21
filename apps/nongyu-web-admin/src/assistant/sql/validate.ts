import { parse, traverse } from "sqlite3-parser";
import {
  TRACK_SQL_ALLOWED_TABLES,
  TRACK_SQL_MAX_BYTES,
  type TrackSqlValidateError,
  type TrackSqlValidateResult,
} from "./types";

const ALLOWED_TABLE_SET = new Set<string>(TRACK_SQL_ALLOWED_TABLES);

function fail(errors: TrackSqlValidateError[]): TrackSqlValidateResult {
  return { ok: false, errors };
}

function tableBase(name: string): string {
  const stripped = name
    .trim()
    .replaceAll("`", "")
    .replaceAll('"', "")
    .replaceAll("[", "")
    .replaceAll("]", "");
  const parts = stripped.split(".");
  return (parts[parts.length - 1] ?? stripped).toLowerCase();
}

function collectPhysicalTables(root: Parameters<typeof traverse>[0]): string[] {
  const cteNames = new Set<string>();
  const rawTables: string[] = [];
  traverse(root, {
    nodes: {
      CommonTableExpr(node) {
        cteNames.add(node.tblName.text.toLowerCase());
      },
      TableSelectTable(node) {
        rawTables.push(node.tblName.objName.text);
      },
      TableCallSelectTable(node) {
        rawTables.push(node.tblName.objName.text);
      },
    },
  });
  const physical: string[] = [];
  const seen = new Set<string>();
  for (const raw of rawTables) {
    const base = tableBase(raw);
    if (!base || cteNames.has(base) || seen.has(base)) continue;
    seen.add(base);
    physical.push(base);
  }
  return physical;
}

/**
 * 浏览器端 Track SQL 四项校验（体验层）。
 * 语法错误与多语句/写操作/越表一律拦截；不替代后端 sqlguard。
 */
export function validateTrackSql(sql: string): TrackSqlValidateResult {
  const trimmed = sql.trim();
  if (!trimmed) {
    return fail([{ code: "SYNTAX", message: "SQL 不能为空" }]);
  }
  if (new TextEncoder().encode(sql).length > TRACK_SQL_MAX_BYTES) {
    return fail([{ code: "SYNTAX", message: `SQL 超过 ${TRACK_SQL_MAX_BYTES} 字节` }]);
  }

  const parsed = parse(trimmed);
  if (parsed.status === "error") {
    const message = parsed.errors
      .map((err) => err.toString())
      .join("\n")
      .trim();
    return fail([{ code: "SYNTAX", message: message || "SQL 语法错误" }]);
  }

  const cmds = parsed.root.cmds;
  if (cmds.length !== 1) {
    return fail([{ code: "MULTI_STMT", message: "只允许单条 SQL 语句" }]);
  }

  const stmt = cmds[0];
  if (!stmt || stmt.type !== "SelectStmt") {
    return fail([
      {
        code: "NOT_SELECT",
        message: `只允许 SELECT / WITH 查询，当前语句类型为 ${stmt?.type ?? "unknown"}`,
      },
    ]);
  }

  const tables = collectPhysicalTables(parsed.root);
  if (tables.length === 0) {
    return fail([{ code: "BAD_TABLE", message: "查询必须引用白名单内的物理表" }]);
  }
  const illegal = tables.filter((table) => !ALLOWED_TABLE_SET.has(table));
  if (illegal.length > 0) {
    return fail([
      {
        code: "BAD_TABLE",
        message: `禁止访问表：${illegal.join(", ")}`,
        tables: illegal,
      },
    ]);
  }

  return { ok: true };
}
