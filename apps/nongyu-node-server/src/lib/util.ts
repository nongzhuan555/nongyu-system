import { z } from "zod";
import { AppError, ErrorCodes } from "./errors.js";

export const studentNoSchema = z.string().regex(/^\d{9}$/, "学号格式不正确");

export function parseGender(input: unknown): 0 | 1 | 2 {
  if (input === undefined || input === null || input === "") return 0;
  if (input === "男" || input === 1 || input === "1") return 1;
  if (input === "女" || input === 2 || input === "2") return 2;
  if (input === 0 || input === "0" || input === "未知") return 0;
  const n = Number(input);
  if (n === 0 || n === 1 || n === 2) return n;
  // 教务偶发非标准文案：按未知处理，避免整次登录 400
  return 0;
}

export function previewText(content: string, max = 120): string {
  const plain = content.replace(/<[^>]+>/g, "").trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max)}…`;
}

export function boolFromDb(v: number | boolean): boolean {
  return v === true || v === 1;
}

export type PageResult<T> = {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
};

export function pageParams(page?: number, pageSize?: number) {
  const p = Math.max(1, page ?? 1);
  const ps = Math.min(100, Math.max(1, pageSize ?? 20));
  return { page: p, pageSize: ps, offset: (p - 1) * ps };
}

/** 转义 SQL LIKE 通配符，配合 `ESCAPE '\\\\'` 按字面匹配 */
export function escapeLikePattern(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** 列表 keyword：trim；空则 undefined；超长抛校验错误 */
export function normalizeListKeyword(input: unknown): string | undefined {
  if (input === undefined || input === null) return undefined;
  const trimmed = String(input).trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 64) {
    throw new AppError(ErrorCodes.VALIDATION, "keyword 长度须为 1–64", 400);
  }
  return trimmed;
}
