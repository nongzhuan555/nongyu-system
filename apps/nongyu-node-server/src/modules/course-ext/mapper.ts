export type ScheduleRow = {
  id: string;
  user_id: number;
  title: string;
  content: string;
  location: string;
  day: number;
  start_period: number;
  end_period: number;
  weeks_list: string;
  created_at: Date;
  updated_at: Date;
};

export type NoteRow = {
  id: string;
  user_id: number;
  course_id: string;
  content: string;
  created_at: Date;
  updated_at: Date;
};

export type TodoRow = {
  id: string;
  user_id: number;
  course_id: string;
  content: string;
  status: string;
  due_date: string | null;
  created_at: Date;
  completed_at: Date | null;
  updated_at: Date;
};

export type ScheduleDto = {
  id: string;
  title: string;
  content: string;
  location: string;
  day: number;
  startPeriod: number;
  endPeriod: number;
  weeksList: number[];
  createdAt: string;
  updatedAt: string;
};

export type NoteDto = {
  id: string;
  courseId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type TodoDto = {
  id: string;
  courseId: string;
  content: string;
  status: "pending" | "done";
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
  updatedAt: string;
};

function toIso(d: Date): string {
  return d.toISOString();
}

export function toScheduleDto(row: ScheduleRow): ScheduleDto {
  let weeksList: number[] = [];
  try {
    const parsed = JSON.parse(row.weeks_list);
    if (Array.isArray(parsed)) weeksList = parsed.map(Number);
  } catch {
    // ignore
  }
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    location: row.location,
    day: row.day,
    startPeriod: row.start_period,
    endPeriod: row.end_period,
    weeksList,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export function toNoteDto(row: NoteRow): NoteDto {
  return {
    id: row.id,
    courseId: row.course_id,
    content: row.content,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export function toTodoDto(row: TodoRow): TodoDto {
  return {
    id: row.id,
    courseId: row.course_id,
    content: row.content,
    status: row.status === "done" ? "done" : "pending",
    dueDate: row.due_date,
    createdAt: toIso(row.created_at),
    completedAt: row.completed_at ? toIso(row.completed_at) : null,
    updatedAt: toIso(row.updated_at),
  };
}

export type TombstoneEntity = "schedule" | "note" | "todo";

export type TombstoneRow = {
  entity: string;
  entity_id: string;
  deleted_at: Date;
};

export type TombstoneDto = {
  entity: TombstoneEntity;
  entityId: string;
  deletedAt: string;
};

export function toTombstoneDto(row: TombstoneRow): TombstoneDto {
  const entity =
    row.entity === "note" || row.entity === "todo" || row.entity === "schedule"
      ? row.entity
      : "schedule";
  return {
    entity,
    entityId: row.entity_id,
    deletedAt: toIso(row.deleted_at),
  };
}
