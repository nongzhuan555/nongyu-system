import { tool } from "nongyu-agent-sdk";
import { z } from "zod";
import { queryTrackSql } from "../../lib/adminApi";
import { putSqlRows } from "../tools/sqlResultStore";
import { consumeSqlExecuteSlot } from "./session";
import { TRACK_SQL_MAX_BYTES, TRACK_SQL_MAX_EXECUTES, TRACK_SQL_PREVIEW_ROWS } from "./types";
import { validateTrackSql } from "./validate";

export const sqlValidateTool = tool({
  name: "sql_validate",
  description:
    "用 sqlite3-parser 校验 Track SQL：单语句、仅 SELECT/WITH、表白名单、语法。未通过必须改 SQL，禁止执行。此工具为必须执行的前置校验工具，不可跳过。",
  inputSchema: z.object({
    sql: z.string().min(1).max(TRACK_SQL_MAX_BYTES),
  }),
  execute: async (input) => validateTrackSql(input.sql),
});

export const sqlExecuteTool = tool({
  name: "sql_execute",
  description:
    "执行已通过校验的只读 SELECT。入参只有 sql。发请求前会再跑四项校验；本轮最多 3 次后端执行。",
  inputSchema: z.object({
    sql: z.string().min(1).max(TRACK_SQL_MAX_BYTES),
  }),
  execute: async (input) => {
    const validated = validateTrackSql(input.sql);
    if (!validated.ok) return validated;
    if (!consumeSqlExecuteSlot()) {
      return {
        ok: false as const,
        message: `本轮最多执行 ${TRACK_SQL_MAX_EXECUTES} 次 SQL，请停止并说明失败原因`,
      };
    }
    try {
      const result = await queryTrackSql(input.sql);
      const uiId = `sql_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      putSqlRows(uiId, result.rows);
      return {
        sql: result.sql,
        columns: result.columns,
        truncated: result.truncated,
        rowCount: result.rowCount,
        preview: result.rows.slice(0, TRACK_SQL_PREVIEW_ROWS),
        uiId,
      };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
