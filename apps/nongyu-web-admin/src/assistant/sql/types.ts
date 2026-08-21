/** Track 只读表白名单，与 Go sqlguard 对齐。 */
export const TRACK_SQL_ALLOWED_TABLES = [
  "events",
  "daily_metrics",
  "daily_dims",
  "user_presence",
] as const;

export const TRACK_SQL_MAX_BYTES = 8000;
export const TRACK_SQL_MAX_EXECUTES = 3;
export const TRACK_SQL_PREVIEW_ROWS = 30;

export type TrackSqlChartType = "line" | "bar" | "pie" | "table";

export type TrackSqlValidateErrorCode = "SYNTAX" | "MULTI_STMT" | "NOT_SELECT" | "BAD_TABLE";

export type TrackSqlValidateError = {
  code: TrackSqlValidateErrorCode;
  message: string;
  tables?: string[];
};

export type TrackSqlValidateResult = { ok: true } | { ok: false; errors: TrackSqlValidateError[] };

export type TrackSqlExecuteSuccess = {
  sql: string;
  columns: string[];
  preview: Record<string, unknown>[];
  truncated: boolean;
  rowCount: number;
  uiId: string;
};

export type TrackSqlExecuteFailure = {
  ok: false;
  message: string;
  errors?: TrackSqlValidateError[];
};
