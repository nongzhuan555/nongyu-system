import type { PerfRange } from "../types/dashboard";

const SHANGHAI = "Asia/Shanghai";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** 业务日（上海）今天 YYYY-MM-DD */
export function businessToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SHANGHAI,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** 日历日加减（基于 YYYY-MM-DD，UTC 正午避免 DST 干扰） */
export function addBusinessDays(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const mid = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0));
  mid.setUTCDate(mid.getUTCDate() + delta);
  return `${mid.getUTCFullYear()}-${pad2(mid.getUTCMonth() + 1)}-${pad2(mid.getUTCDate())}`;
}

/** perfRange → 闭区间 [from, to]（含今天共 N 天） */
export function perfRangeBounds(range: PerfRange, now = new Date()): { from: string; to: string } {
  const to = businessToday(now);
  if (range === "1d") return { from: to, to };
  if (range === "7d") return { from: addBusinessDays(to, -6), to };
  return { from: addBusinessDays(to, -29), to };
}
