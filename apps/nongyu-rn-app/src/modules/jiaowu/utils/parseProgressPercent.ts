/**
 * 从学业进度文案解析 0–100 百分比；失败返回 null
 */
export function parseProgressPercent(progress: string): number | null {
  const match = progress.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return null;
  let pct = n;
  if (n > 0 && n <= 1) pct = n * 100;
  if (pct < 0 || pct > 100) {
    pct = Math.min(100, Math.max(0, pct));
  }
  return pct;
}
