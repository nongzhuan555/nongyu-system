import dayjs from "dayjs";
import type { Gender } from "../types/users";

/** 空值统一展示为破折号，避免表格里出现 null。 */
export function displayText(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return value;
}

export function formatAdminDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const parsed = dayjs(iso);
  if (!parsed.isValid()) return "—";
  return parsed.format("YYYY-MM-DD HH:mm");
}

export function formatAdminEpochMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return "—";
  return formatAdminDateTime(new Date(ms).toISOString());
}

export function formatGender(gender: Gender): string {
  if (gender === 1) return "男";
  if (gender === 2) return "女";
  return "未知";
}

export function formatBool(value: boolean): string {
  return value ? "是" : "否";
}

/** 后端 coverageRate 为 0–1 小数。 */
export function formatCoverageRate(rate: number): string {
  if (!Number.isFinite(rate)) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}
