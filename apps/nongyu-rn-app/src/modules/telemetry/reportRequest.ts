import { reportCrash } from "./reportCrash";

const DEDUP_MS = 60_000;

/** method|path|code|network → 上次入队时间 */
const lastReportedAt = new Map<string, number>();

export type ReportAppRequestErrorInput = {
  kind: "network" | "api";
  message: string;
  method: string;
  path: string;
  httpStatus?: number;
  code?: number;
};

/**
 * 农屿 Node 请求失败上报；60s 同 key 降噪；不改变调用方 throw 语义
 */
export function reportAppRequestError(input: ReportAppRequestErrorInput): void {
  const path = stripQuery(input.path);
  const method = (input.method || "GET").toUpperCase();
  const dedupeKey =
    input.kind === "api" ? `${method}|${path}|${input.code ?? "api"}` : `${method}|${path}|network`;

  const now = Date.now();
  const prev = lastReportedAt.get(dedupeKey);
  if (prev != null && now - prev < DEDUP_MS) return;
  lastReportedAt.set(dedupeKey, now);

  reportCrash(input.kind, {
    message: input.message,
    method,
    path,
    ...(input.httpStatus != null ? { http_status: input.httpStatus } : {}),
    ...(input.code != null ? { code: input.code } : {}),
  });
}

/**
 * 只保留 pathname，去掉 query
 */
function stripQuery(path: string): string {
  const trimmed = path.trim();
  const q = trimmed.indexOf("?");
  return q >= 0 ? trimmed.slice(0, q) : trimmed;
}
