import type { CourseAttendance, CourseNote, CourseTodo, ScheduleEntry } from "../model/types";
import type { CourseExtEntity, CourseExtOutboxOp, CourseExtTombstone } from "../model/syncTypes";
import {
  readLocalSchedules,
  writeLocalSchedules,
  clearLocalSchedules,
  readLocalNotes,
  writeLocalNotes,
  clearLocalNotes,
  readLocalTodos,
  writeLocalTodos,
  clearLocalTodos,
  readLocalAttendances,
  writeLocalAttendances,
  clearLocalAttendances,
} from "./courseExtLocalStore";
import {
  enqueueOutbox,
  readOutbox,
  writeOutbox,
  removeOutboxForEntity,
  clearOutbox,
} from "./courseExtOutboxStore";
import {
  readLocalTombstones,
  upsertLocalTombstone,
  mergeTombstones,
  clearLocalTombstones,
} from "./courseExtTombstoneStore";
import {
  listSchedulesApi,
  createScheduleApi,
  updateScheduleApi,
  deleteScheduleApi,
  listNotesApi,
  createNoteApi,
  updateNoteApi,
  deleteNoteApi,
  listTodosApi,
  createTodoApi,
  updateTodoApi,
  deleteTodoApi,
  listAttendancesApi,
  upsertAttendanceApi,
  deleteAttendanceApi,
  listTombstonesApi,
} from "./courseExtApi";

export type CourseExtSnapshot = {
  schedules: ScheduleEntry[];
  notes: CourseNote[];
  todos: CourseTodo[];
  attendances: CourseAttendance[];
};

function tombstoneKey(entity: CourseExtEntity, entityId: string): string {
  return `${entity}:${entityId}`;
}

function attendanceSlotKey(a: Pick<CourseAttendance, "courseId" | "week" | "day">): string {
  return `${a.courseId}:${a.week}:${a.day}`;
}

function applyTombstonesToLists(
  schedules: ScheduleEntry[],
  notes: CourseNote[],
  todos: CourseTodo[],
  attendances: CourseAttendance[],
  tombstones: CourseExtTombstone[],
): CourseExtSnapshot {
  const dead = new Set(tombstones.map((t) => tombstoneKey(t.entity, t.entityId)));
  return {
    schedules: schedules.filter((s) => !dead.has(tombstoneKey("schedule", s.id))),
    notes: notes.filter((n) => !dead.has(tombstoneKey("note", n.id))),
    todos: todos.filter((t) => !dead.has(tombstoneKey("todo", t.id))),
    attendances: attendances.filter((a) => !dead.has(tombstoneKey("attendance", a.id))),
  };
}

/**
 * 同 id 合并：远程权威；本地独有且无 tombstone 的保留（待 outbox 重推）
 */
function mergeById<T extends { id: string }>(
  local: T[],
  remote: T[],
  entity: CourseExtEntity,
  tombstones: CourseExtTombstone[],
): T[] {
  const dead = new Set(tombstones.filter((t) => t.entity === entity).map((t) => t.entityId));
  const remoteIds = new Set(remote.map((r) => r.id));
  const remoteKept = remote.filter((r) => !dead.has(r.id));
  const localOnly = local.filter((l) => !remoteIds.has(l.id) && !dead.has(l.id));
  return [...remoteKept, ...localOnly];
}

/**
 * 考勤按 (courseId, week, day) 去重，远程权威
 */
function mergeAttendances(
  local: CourseAttendance[],
  remote: CourseAttendance[],
  tombstones: CourseExtTombstone[],
): CourseAttendance[] {
  const dead = new Set(tombstones.filter((t) => t.entity === "attendance").map((t) => t.entityId));
  const bySlot = new Map<string, CourseAttendance>();
  for (const r of remote) {
    if (dead.has(r.id)) continue;
    bySlot.set(attendanceSlotKey(r), r);
  }
  for (const l of local) {
    if (dead.has(l.id)) continue;
    const key = attendanceSlotKey(l);
    if (!bySlot.has(key)) bySlot.set(key, l);
  }
  return [...bySlot.values()];
}

/**
 * 拉取远程 + tombstone，合并本地，入队未同步 create，再 flush outbox
 */
export async function pullCourseExt(studentId: string): Promise<CourseExtSnapshot> {
  const [schedules, notes, todos, attendances, remoteTombs] = await Promise.all([
    listSchedulesApi(),
    listNotesApi(),
    listTodosApi(),
    listAttendancesApi(),
    listTombstonesApi(),
  ]);

  const tombstones = mergeTombstones(
    studentId,
    remoteTombs.map((t) => ({
      entity: t.entity,
      entityId: t.entityId,
      deletedAt: t.deletedAt,
    })),
  );

  const localSchedules = readLocalSchedules(studentId) ?? [];
  const localNotes = readLocalNotes(studentId) ?? [];
  const localTodos = readLocalTodos(studentId) ?? [];
  const localAttendances = readLocalAttendances(studentId) ?? [];

  const mergedSchedules = mergeById(
    localSchedules,
    schedules.map((s) => ({ ...s, studentId })),
    "schedule",
    tombstones,
  );
  const mergedNotes = mergeById(
    localNotes,
    notes.map((n) => ({ ...n, studentId })),
    "note",
    tombstones,
  );
  const mergedTodos = mergeById(
    localTodos,
    todos.map((t) => ({ ...t, studentId })),
    "todo",
    tombstones,
  );
  const mergedAttendances = mergeAttendances(
    localAttendances,
    attendances.map((a) => ({ ...a, studentId })),
    tombstones,
  );

  const now = new Date().toISOString();
  const remoteScheduleIds = new Set(schedules.map((s) => s.id));
  const remoteNoteIds = new Set(notes.map((n) => n.id));
  const remoteTodoIds = new Set(todos.map((t) => t.id));
  const remoteAttendanceIds = new Set(attendances.map((a) => a.id));
  const remoteAttendanceSlots = new Set(attendances.map((a) => attendanceSlotKey(a)));

  for (const s of mergedSchedules) {
    if (!remoteScheduleIds.has(s.id)) {
      enqueueOutbox(studentId, {
        op: "create",
        entity: "schedule",
        entityId: s.id,
        payload: s,
        updatedAt: now,
      });
    }
  }
  for (const n of mergedNotes) {
    if (!remoteNoteIds.has(n.id)) {
      enqueueOutbox(studentId, {
        op: "create",
        entity: "note",
        entityId: n.id,
        payload: n,
        updatedAt: now,
      });
    }
  }
  for (const t of mergedTodos) {
    if (!remoteTodoIds.has(t.id)) {
      enqueueOutbox(studentId, {
        op: "create",
        entity: "todo",
        entityId: t.id,
        payload: t,
        updatedAt: now,
      });
    }
  }
  for (const a of mergedAttendances) {
    if (!remoteAttendanceIds.has(a.id) && !remoteAttendanceSlots.has(attendanceSlotKey(a))) {
      enqueueOutbox(studentId, {
        op: "create",
        entity: "attendance",
        entityId: a.id,
        payload: a,
        updatedAt: now,
      });
    }
  }

  for (const tomb of tombstones) {
    if (tomb.entity === "schedule" && remoteScheduleIds.has(tomb.entityId)) {
      enqueueOutbox(studentId, {
        op: "delete",
        entity: "schedule",
        entityId: tomb.entityId,
        updatedAt: now,
      });
    }
    if (tomb.entity === "note" && remoteNoteIds.has(tomb.entityId)) {
      enqueueOutbox(studentId, {
        op: "delete",
        entity: "note",
        entityId: tomb.entityId,
        updatedAt: now,
      });
    }
    if (tomb.entity === "todo" && remoteTodoIds.has(tomb.entityId)) {
      enqueueOutbox(studentId, {
        op: "delete",
        entity: "todo",
        entityId: tomb.entityId,
        updatedAt: now,
      });
    }
    if (tomb.entity === "attendance" && remoteAttendanceIds.has(tomb.entityId)) {
      enqueueOutbox(studentId, {
        op: "delete",
        entity: "attendance",
        entityId: tomb.entityId,
        updatedAt: now,
      });
    }
  }

  const cleaned = applyTombstonesToLists(
    mergedSchedules,
    mergedNotes,
    mergedTodos,
    mergedAttendances,
    tombstones,
  );
  writeLocalSchedules(studentId, cleaned.schedules);
  writeLocalNotes(studentId, cleaned.notes);
  writeLocalTodos(studentId, cleaned.todos);
  writeLocalAttendances(studentId, cleaned.attendances);

  await flushOutbox(studentId);

  return {
    schedules: readLocalSchedules(studentId) ?? cleaned.schedules,
    notes: readLocalNotes(studentId) ?? cleaned.notes,
    todos: readLocalTodos(studentId) ?? cleaned.todos,
    attendances: readLocalAttendances(studentId) ?? cleaned.attendances,
  };
}

/**
 * 冲刷 outbox：成功出队；失败保留；create 遇已存在视为成功
 */
export async function flushOutbox(studentId: string): Promise<void> {
  const ops = readOutbox(studentId);
  if (ops.length === 0) return;

  const remaining: CourseExtOutboxOp[] = [];

  for (const op of ops) {
    try {
      await applyOutboxOp(op);
    } catch (err) {
      if (op.op === "create" && isAlreadyExistsError(err)) {
        continue;
      }
      remaining.push(op);
    }
  }

  writeOutbox(studentId, remaining);
}

async function applyOutboxOp(op: CourseExtOutboxOp): Promise<void> {
  if (op.entity === "schedule") {
    if (op.op === "create") await createScheduleApi(op.payload as ScheduleEntry);
    else if (op.op === "update") {
      await updateScheduleApi(
        op.entityId,
        op.payload as Partial<Omit<ScheduleEntry, "id" | "studentId" | "createdAt">>,
      );
    } else await deleteScheduleApi(op.entityId);
    return;
  }
  if (op.entity === "note") {
    if (op.op === "create") await createNoteApi(op.payload as CourseNote);
    else if (op.op === "update") {
      await updateNoteApi(op.entityId, op.payload as { content?: string; updatedAt: string });
    } else await deleteNoteApi(op.entityId);
    return;
  }
  if (op.entity === "todo") {
    if (op.op === "create") await createTodoApi(op.payload as CourseTodo);
    else if (op.op === "update") {
      await updateTodoApi(
        op.entityId,
        op.payload as {
          content?: string;
          status?: "pending" | "done";
          dueDate?: string | null;
          completedAt?: string | null;
          updatedAt: string;
        },
      );
    } else await deleteTodoApi(op.entityId);
    return;
  }
  // attendance：create/update 均走 upsert
  if (op.op === "delete") {
    await deleteAttendanceApi(op.entityId);
    return;
  }
  await upsertAttendanceApi(op.payload as CourseAttendance);
}

function isAlreadyExistsError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /duplicate|exists|ER_DUP|唯一|已存在|409/i.test(msg);
}

export function loadLocalCourseExt(studentId: string): CourseExtSnapshot {
  const tombstones = readLocalTombstones(studentId);
  return applyTombstonesToLists(
    readLocalSchedules(studentId) ?? [],
    readLocalNotes(studentId) ?? [],
    readLocalTodos(studentId) ?? [],
    readLocalAttendances(studentId) ?? [],
    tombstones,
  );
}

// ===== Schedules =====

export async function addSchedule(studentId: string, entry: ScheduleEntry): Promise<void> {
  const list = readLocalSchedules(studentId) ?? [];
  writeLocalSchedules(studentId, [...list, entry]);
  try {
    await createScheduleApi(entry);
  } catch {
    enqueueOutbox(studentId, {
      op: "create",
      entity: "schedule",
      entityId: entry.id,
      payload: entry,
      updatedAt: entry.updatedAt,
    });
  }
}

export async function editSchedule(
  studentId: string,
  id: string,
  patch: Partial<Omit<ScheduleEntry, "id" | "studentId" | "createdAt">>,
): Promise<void> {
  const list = readLocalSchedules(studentId) ?? [];
  const next = list.map((s) =>
    s.id === id ? { ...s, ...patch, id: s.id, studentId: s.studentId, createdAt: s.createdAt } : s,
  );
  writeLocalSchedules(studentId, next);
  try {
    await updateScheduleApi(id, patch);
  } catch {
    enqueueOutbox(studentId, {
      op: "update",
      entity: "schedule",
      entityId: id,
      payload: patch,
      updatedAt: patch.updatedAt ?? new Date().toISOString(),
    });
  }
}

export async function removeSchedule(studentId: string, id: string): Promise<void> {
  const list = readLocalSchedules(studentId) ?? [];
  writeLocalSchedules(
    studentId,
    list.filter((s) => s.id !== id),
  );
  upsertLocalTombstone(studentId, "schedule", id);
  removeOutboxForEntity(studentId, "schedule", id);
  try {
    await deleteScheduleApi(id);
  } catch {
    enqueueOutbox(studentId, {
      op: "delete",
      entity: "schedule",
      entityId: id,
      updatedAt: new Date().toISOString(),
    });
  }
}

// ===== Notes =====

export async function addNote(studentId: string, note: CourseNote): Promise<void> {
  const list = readLocalNotes(studentId) ?? [];
  writeLocalNotes(studentId, [...list, note]);
  try {
    await createNoteApi(note);
  } catch {
    enqueueOutbox(studentId, {
      op: "create",
      entity: "note",
      entityId: note.id,
      payload: note,
      updatedAt: note.updatedAt,
    });
  }
}

export async function editNote(
  studentId: string,
  id: string,
  patch: { content?: string; updatedAt: string },
): Promise<void> {
  const list = readLocalNotes(studentId) ?? [];
  writeLocalNotes(
    studentId,
    list.map((n) =>
      n.id === id
        ? { ...n, ...patch, id: n.id, studentId: n.studentId, createdAt: n.createdAt }
        : n,
    ),
  );
  try {
    await updateNoteApi(id, patch);
  } catch {
    enqueueOutbox(studentId, {
      op: "update",
      entity: "note",
      entityId: id,
      payload: patch,
      updatedAt: patch.updatedAt,
    });
  }
}

export async function removeNote(studentId: string, id: string): Promise<void> {
  const list = readLocalNotes(studentId) ?? [];
  writeLocalNotes(
    studentId,
    list.filter((n) => n.id !== id),
  );
  upsertLocalTombstone(studentId, "note", id);
  removeOutboxForEntity(studentId, "note", id);
  try {
    await deleteNoteApi(id);
  } catch {
    enqueueOutbox(studentId, {
      op: "delete",
      entity: "note",
      entityId: id,
      updatedAt: new Date().toISOString(),
    });
  }
}

// ===== Todos =====

export async function addTodo(studentId: string, todo: CourseTodo): Promise<void> {
  const list = readLocalTodos(studentId) ?? [];
  writeLocalTodos(studentId, [...list, todo]);
  try {
    await createTodoApi(todo);
  } catch {
    enqueueOutbox(studentId, {
      op: "create",
      entity: "todo",
      entityId: todo.id,
      payload: todo,
      updatedAt: todo.updatedAt,
    });
  }
}

export async function editTodo(
  studentId: string,
  id: string,
  patch: {
    content?: string;
    status?: "pending" | "done";
    dueDate?: string | null;
    completedAt?: string | null;
    updatedAt: string;
  },
): Promise<void> {
  const list = readLocalTodos(studentId) ?? [];
  writeLocalTodos(
    studentId,
    list.map((t) =>
      t.id === id
        ? { ...t, ...patch, id: t.id, studentId: t.studentId, createdAt: t.createdAt }
        : t,
    ),
  );
  try {
    await updateTodoApi(id, patch);
  } catch {
    enqueueOutbox(studentId, {
      op: "update",
      entity: "todo",
      entityId: id,
      payload: patch,
      updatedAt: patch.updatedAt,
    });
  }
}

export async function removeTodo(studentId: string, id: string): Promise<void> {
  const list = readLocalTodos(studentId) ?? [];
  writeLocalTodos(
    studentId,
    list.filter((t) => t.id !== id),
  );
  upsertLocalTombstone(studentId, "todo", id);
  removeOutboxForEntity(studentId, "todo", id);
  try {
    await deleteTodoApi(id);
  } catch {
    enqueueOutbox(studentId, {
      op: "delete",
      entity: "todo",
      entityId: id,
      updatedAt: new Date().toISOString(),
    });
  }
}

// ===== Attendances =====

/**
 * 本地 upsert：同 (courseId, week, day) 复用已有 id
 */
export async function upsertAttendance(studentId: string, entry: CourseAttendance): Promise<void> {
  const list = readLocalAttendances(studentId) ?? [];
  const idx = list.findIndex(
    (a) => a.courseId === entry.courseId && a.week === entry.week && a.day === entry.day,
  );
  const resolved: CourseAttendance =
    idx >= 0
      ? {
          ...entry,
          id: list[idx]!.id,
          createdAt: list[idx]!.createdAt,
          studentId,
        }
      : { ...entry, studentId };
  const next = idx >= 0 ? list.map((a, i) => (i === idx ? resolved : a)) : [...list, resolved];
  writeLocalAttendances(studentId, next);
  try {
    await upsertAttendanceApi(resolved);
  } catch {
    enqueueOutbox(studentId, {
      op: "create",
      entity: "attendance",
      entityId: resolved.id,
      payload: resolved,
      updatedAt: resolved.updatedAt,
    });
  }
}

export async function removeAttendance(studentId: string, id: string): Promise<void> {
  const list = readLocalAttendances(studentId) ?? [];
  writeLocalAttendances(
    studentId,
    list.filter((a) => a.id !== id),
  );
  upsertLocalTombstone(studentId, "attendance", id);
  removeOutboxForEntity(studentId, "attendance", id);
  try {
    await deleteAttendanceApi(id);
  } catch {
    enqueueOutbox(studentId, {
      op: "delete",
      entity: "attendance",
      entityId: id,
      updatedAt: new Date().toISOString(),
    });
  }
}

/**
 * 清空某用户全部课表扩展本地数据（登出用）
 */
export function clearLocalCourseExt(studentId: string): void {
  clearLocalSchedules(studentId);
  clearLocalNotes(studentId);
  clearLocalTodos(studentId);
  clearLocalAttendances(studentId);
  clearOutbox(studentId);
  clearLocalTombstones(studentId);
}
