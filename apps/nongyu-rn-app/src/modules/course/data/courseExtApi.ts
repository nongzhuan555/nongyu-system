import { appFetch } from "@/api/appClient";
import type { CourseNote, CourseTodo, ScheduleEntry } from "../model/types";
import type { CourseExtTombstone } from "../model/syncTypes";

const BASE = "/api/app/course-ext";

// ===== Schedules =====

export async function listSchedulesApi(): Promise<ScheduleEntry[]> {
  return appFetch<ScheduleEntry[]>(`${BASE}/schedules`);
}

export async function createScheduleApi(entry: ScheduleEntry): Promise<void> {
  await appFetch(`${BASE}/schedules`, {
    method: "POST",
    body: JSON.stringify(entry),
    allowNullData: true,
  });
}

export async function updateScheduleApi(
  id: string,
  patch: Partial<Omit<ScheduleEntry, "id" | "studentId" | "createdAt">>,
): Promise<void> {
  await appFetch(`${BASE}/schedules/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
    allowNullData: true,
  });
}

export async function deleteScheduleApi(id: string): Promise<void> {
  await appFetch(`${BASE}/schedules/${id}`, {
    method: "DELETE",
    allowNullData: true,
  });
}

// ===== Notes =====

export async function listNotesApi(courseId?: string): Promise<CourseNote[]> {
  const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : "";
  return appFetch<CourseNote[]>(`${BASE}/notes${query}`);
}

export async function createNoteApi(note: CourseNote): Promise<void> {
  await appFetch(`${BASE}/notes`, {
    method: "POST",
    body: JSON.stringify(note),
    allowNullData: true,
  });
}

export async function updateNoteApi(
  id: string,
  patch: { content?: string; updatedAt: string },
): Promise<void> {
  await appFetch(`${BASE}/notes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
    allowNullData: true,
  });
}

export async function deleteNoteApi(id: string): Promise<void> {
  await appFetch(`${BASE}/notes/${id}`, {
    method: "DELETE",
    allowNullData: true,
  });
}

// ===== Todos =====

export async function listTodosApi(courseId?: string): Promise<CourseTodo[]> {
  const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : "";
  return appFetch<CourseTodo[]>(`${BASE}/todos${query}`);
}

export async function createTodoApi(todo: CourseTodo): Promise<void> {
  await appFetch(`${BASE}/todos`, {
    method: "POST",
    body: JSON.stringify(todo),
    allowNullData: true,
  });
}

export async function updateTodoApi(
  id: string,
  patch: {
    content?: string;
    status?: "pending" | "done";
    dueDate?: string | null;
    completedAt?: string | null;
    updatedAt: string;
  },
): Promise<void> {
  await appFetch(`${BASE}/todos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
    allowNullData: true,
  });
}

export async function deleteTodoApi(id: string): Promise<void> {
  await appFetch(`${BASE}/todos/${id}`, {
    method: "DELETE",
    allowNullData: true,
  });
}

// ===== Tombstones =====

export async function listTombstonesApi(): Promise<CourseExtTombstone[]> {
  return appFetch<CourseExtTombstone[]>(`${BASE}/tombstones`);
}
