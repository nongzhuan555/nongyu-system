import { appStorage } from "@/storage/mmkv";
import type { CourseAttendance, CourseNote, CourseTodo, ScheduleEntry } from "../model/types";

const SCHEDULES_KEY_PREFIX = "course:schedules:";
const NOTES_KEY_PREFIX = "course:notes:";
const TODOS_KEY_PREFIX = "course:todos:";
const ATTENDANCES_KEY_PREFIX = "course:attendances:";

function schedulesKey(studentId: string): string {
  return `${SCHEDULES_KEY_PREFIX}${studentId}`;
}
function notesKey(studentId: string): string {
  return `${NOTES_KEY_PREFIX}${studentId}`;
}
function todosKey(studentId: string): string {
  return `${TODOS_KEY_PREFIX}${studentId}`;
}
function attendancesKey(studentId: string): string {
  return `${ATTENDANCES_KEY_PREFIX}${studentId}`;
}

function readArray<T>(key: string): T[] | null {
  const raw = appStorage.getString(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as T[];
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeArray<T>(key: string, items: T[]): void {
  appStorage.set(key, JSON.stringify(items));
}

// ===== Schedules =====

export function readLocalSchedules(studentId: string): ScheduleEntry[] | null {
  return readArray<ScheduleEntry>(schedulesKey(studentId));
}

export function writeLocalSchedules(studentId: string, items: ScheduleEntry[]): void {
  writeArray(schedulesKey(studentId), items);
}

export function clearLocalSchedules(studentId: string): void {
  appStorage.delete(schedulesKey(studentId));
}

// ===== Notes =====

export function readLocalNotes(studentId: string): CourseNote[] | null {
  return readArray<CourseNote>(notesKey(studentId));
}

export function writeLocalNotes(studentId: string, items: CourseNote[]): void {
  writeArray(notesKey(studentId), items);
}

export function clearLocalNotes(studentId: string): void {
  appStorage.delete(notesKey(studentId));
}

// ===== Todos =====

export function readLocalTodos(studentId: string): CourseTodo[] | null {
  return readArray<CourseTodo>(todosKey(studentId));
}

export function writeLocalTodos(studentId: string, items: CourseTodo[]): void {
  writeArray(todosKey(studentId), items);
}

export function clearLocalTodos(studentId: string): void {
  appStorage.delete(todosKey(studentId));
}

// ===== Attendances =====

export function readLocalAttendances(studentId: string): CourseAttendance[] | null {
  return readArray<CourseAttendance>(attendancesKey(studentId));
}

export function writeLocalAttendances(studentId: string, items: CourseAttendance[]): void {
  writeArray(attendancesKey(studentId), items);
}

export function clearLocalAttendances(studentId: string): void {
  appStorage.delete(attendancesKey(studentId));
}
