/** 业务日（Asia/Shanghai 日历日）工具，对齐 Go internal/bizday。 */

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

function shanghaiParts(t: Date): { y: number; m: number; d: number } {
  const shifted = new Date(t.getTime() + SHANGHAI_OFFSET_MS);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
  };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** 按上海日历日格式化为 YYYY-MM-DD */
export function statDate(t: Date = new Date()): string {
  const { y, m, d } = shanghaiParts(t);
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** 解析 YYYY-MM-DD；非法则抛错 */
export function parseDate(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) throw new Error("invalid date");
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  // 用 UTC 正午避免 DST；业务日只关心日历字符串
  const dt = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    throw new Error("invalid date");
  }
  return dt;
}

/** 返回 t 所在上海日的前一日 YYYY-MM-DD */
export function yesterday(t: Date = new Date()): string {
  const { y, m, d } = shanghaiParts(t);
  const mid = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  mid.setUTCDate(mid.getUTCDate() - 1);
  return `${mid.getUTCFullYear()}-${pad2(mid.getUTCMonth() + 1)}-${pad2(mid.getUTCDate())}`;
}

export function isToday(date: string, t: Date = new Date()): boolean {
  return date === statDate(t);
}

/** 上海时区的时、分（用于定时任务） */
export function shanghaiHourMinute(t: Date = new Date()): { hour: number; minute: number } {
  const shifted = new Date(t.getTime() + SHANGHAI_OFFSET_MS);
  return { hour: shifted.getUTCHours(), minute: shifted.getUTCMinutes() };
}
