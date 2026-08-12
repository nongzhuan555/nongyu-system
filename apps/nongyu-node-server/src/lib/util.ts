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
  throw new AppError(ErrorCodes.VALIDATION, "gender 无效", 400);
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
