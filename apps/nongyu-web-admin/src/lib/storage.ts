import type { AdminSession, AdminUser } from "../types/auth";
import { STORAGE_REMEMBER_STUDENT_NO_KEY, STORAGE_SESSION_KEY } from "./constants";

function isAdminUser(value: unknown): value is AdminUser {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "number" &&
    typeof record.studentNo === "string" &&
    typeof record.name === "string" &&
    (record.role === 1 || record.role === 2)
  );
}

function isAdminSession(value: unknown): value is AdminSession {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.token === "string" && record.token.length > 0 && isAdminUser(record.user);
}

/** 隐私模式或配额满时不得让页面白屏。 */
export function readSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isAdminSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeSession(session: AdminSession): void {
  try {
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
  } catch {
    // 存储失败时仍允许本次内存会话，刷新后需重登
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_SESSION_KEY);
  } catch {
    // 忽略无法写入的存储环境
  }
}

export function readRememberedStudentNo(): string {
  try {
    return localStorage.getItem(STORAGE_REMEMBER_STUDENT_NO_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeRememberedStudentNo(studentNo: string): void {
  try {
    localStorage.setItem(STORAGE_REMEMBER_STUDENT_NO_KEY, studentNo);
  } catch {
    // 忽略
  }
}

export function clearRememberedStudentNo(): void {
  try {
    localStorage.removeItem(STORAGE_REMEMBER_STUDENT_NO_KEY);
  } catch {
    // 忽略
  }
}
