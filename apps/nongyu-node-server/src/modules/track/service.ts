import { getEnv } from "../../config/env.js";
import { businessDayUtcRange } from "../../lib/time.js";
import { mapCrashes, mapDims, mapOverview, mapSqlQuery, mapTrend } from "./map.js";
import { trackAdminGet, trackAdminPost } from "./trackClient.js";

export function todayBusinessDate(): string {
  return businessDayUtcRange(getEnv().BUSINESS_TZ).dateKey;
}

export async function getTrackOverview(date: string) {
  const data = await trackAdminGet(`/v1/admin/overview?date=${encodeURIComponent(date)}`);
  return mapOverview(data);
}

export async function getTrackDims(
  metric: string,
  date: string,
  limit: number,
  opts?: { platform?: string; namePrefix?: string },
) {
  const query = new URLSearchParams({
    metric,
    date,
    limit: String(limit),
  });
  if (opts?.platform) query.set("platform", opts.platform);
  if (opts?.namePrefix) query.set("name_prefix", opts.namePrefix);
  const data = await trackAdminGet(`/v1/admin/metrics/dims?${query.toString()}`);
  return mapDims(data);
}

export async function getTrackCrashes(from: string, to: string, page: number, pageSize: number) {
  const query = new URLSearchParams({
    from,
    to,
    page: String(page),
    page_size: String(pageSize),
  });
  const data = await trackAdminGet(`/v1/admin/crashes?${query.toString()}`);
  return mapCrashes(data, page, pageSize);
}

export async function getTrackLlmProxyFails(
  from: string,
  to: string,
  page: number,
  pageSize: number,
  errorCode?: string,
) {
  const query = new URLSearchParams({
    from,
    to,
    page: String(page),
    page_size: String(pageSize),
  });
  if (errorCode) query.set("error_code", errorCode);
  const data = await trackAdminGet(`/v1/admin/llm-proxy-fails?${query.toString()}`);
  return mapCrashes(data, page, pageSize);
}

export async function getTrackTrend(metric: string, from: string, to: string) {
  const query = new URLSearchParams({ metric, from, to });
  const data = await trackAdminGet(`/v1/admin/metrics/trend?${query.toString()}`);
  return mapTrend(data);
}

export async function queryTrackSql(sql: string) {
  const data = await trackAdminPost("/v1/admin/sql/query", { sql });
  return mapSqlQuery(data);
}
