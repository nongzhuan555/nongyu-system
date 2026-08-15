import type { CourseNote, CourseTodo, ScheduleEntry } from "../model/types";
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
  listTombstonesApi,
} from "./courseExtApi";

export type CourseExtSnapshot = {
  schedules: ScheduleEntry[];
  notes: CourseNote[];
  todos: CourseTodo[];
};

function tombstoneKey(entity: CourseExtEntity, entityId: string): string {
  return `${entity}:${entityId}`;
}

function applyTombstonesToLists(
  schedules: ScheduleEntry[],
  notes: CourseNote[],
  todos: CourseTodo[],
  tombstones: CourseExtTombstone[],
): CourseExtSnapshot {
  const dead = new Set(tombstones.map((t) => tombstoneKey(t.entity, t.entityId)));
  return {
    schedules: schedules.filter((s) => !dead.has(tombstoneKey("schedule", s.id))),
    notes: notes.filter((n) => !dead.has(tombstoneKey("note", n.id))),
    todos: todos.filter((t) => !dead.has(tombstoneKey("todo", t.id))),
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
 * 拉取远程三类 + tombstone，合并本地，入队未同步 create，再 flush outbox
 */
export async function pullCourseExt(studentId: string): Promise<CourseExtSnapshot> {
  const [schedules, notes, todos, remoteTombs] = await Promise.all([
    listSchedulesApi(),
    listNotesApi(),
    listTodosApi(),
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

  // 本地有、远程无、无 tombstone → 入队 create 重推
  const now = new Date().toISOString();
  const remoteScheduleIds = new Set(schedules.map((s) => s.id));
  const remoteNoteIds = new Set(notes.map((n) => n.id));
  const remoteTodoIds = new Set(todos.map((t) => t.id));

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

  // 本地 tombstone 且远程仍有实体 → 入队 delete
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
  }

  const cleaned = applyTombstonesToLists(mergedSchedules, mergedNotes, mergedTodos, tombstones);
  writeLocalSchedules(studentId, cleaned.schedules);
  writeLocalNotes(studentId, cleaned.notes);
  writeLocalTodos(studentId, cleaned.todos);

  await flushOutbox(studentId);

  return {
    schedules: readLocalSchedules(studentId) ?? cleaned.schedules,
    notes: readLocalNotes(studentId) ?? cleaned.notes,
    todos: readLocalTodos(studentId) ?? cleaned.todos,
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
      // 成功：delete 时本地 tombstone 已存在；create/update 清同 id 冲突队列已在 enqueue 去重
    } catch (err) {
      // create 幂等：远程已有则视为成功
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

/**
 * 清空某用户全部课表扩展本地数据（登出用）
 */
export function clearLocalCourseExt(studentId: string): void {
  clearLocalSchedules(studentId);
  clearLocalNotes(studentId);
  clearLocalTodos(studentId);
  clearOutbox(studentId);
  clearLocalTombstones(studentId);
}
