import { tool } from "nongyu-agent-sdk";
import { z } from "zod";
import { queryTrackSql } from "../../lib/adminApi";
import { putSqlRows } from "./sqlResultStore";

export const adminTrackSqlTool = tool({
  name: "admin_track_sql",
  description:
    "仅当专用指标工具无法回答时，对 Track SQLite 执行只读 SELECT。表白名单：events、daily_metrics、daily_dims、user_presence。禁止写语句与 meta_jobs。趋势用 line，比例用 pie，对比用 bar，明细用 table。",
  inputSchema: z.object({
    sql: z.string().min(1).max(8000),
    chartType: z.enum(["line", "bar", "pie", "table"]),
  }),
  render: { component: "AdminSqlBlock" },
  execute: async (input) => {
    const result = await queryTrackSql(input.sql);
    const uiId = `sql_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    putSqlRows(uiId, result.rows);
    return {
      sql: result.sql,
      columns: result.columns,
      truncated: result.truncated,
      rowCount: result.rowCount,
      preview: result.rows.slice(0, 30),
      chartType: input.chartType,
      uiId,
    };
  },
});
