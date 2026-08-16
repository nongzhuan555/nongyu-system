import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middlewares/common.js";
import { requireAppAuth } from "../../middlewares/auth.js";
import { AppError, ErrorCodes } from "../../lib/errors.js";
import { ok } from "../../lib/response.js";
import {
  listSchedules,
  insertSchedule,
  updateSchedule,
  deleteSchedule,
  listNotes,
  insertNote,
  updateNote,
  deleteNote,
  listTodos,
  insertTodo,
  updateTodo,
  deleteTodo,
  listAttendances,
  upsertAttendance,
  updateAttendance,
  deleteAttendance,
  upsertTombstone,
  listTombstones,
} from "./repo.js";
import { toScheduleDto, toNoteDto, toTodoDto, toAttendanceDto, toTombstoneDto } from "./mapper.js";

export const appCourseExtRouter = Router();

const iso = z.string().datetime();
const uuid = z.string().uuid();

const scheduleColorIndex = z.number().int().min(0).max(7).nullable();

const scheduleCreateSchema = z.object({
  id: uuid,
  title: z.string().min(1).max(128),
  content: z.string().max(1024).default(""),
  location: z.string().max(128).default(""),
  day: z.number().int().min(1).max(7),
  startPeriod: z.number().int().min(1).max(10),
  endPeriod: z.number().int().min(1).max(10),
  weeksList: z.array(z.number().int().min(1)).default([]),
  colorIndex: scheduleColorIndex.optional().default(null),
  createdAt: iso,
  updatedAt: iso,
});

const schedulePatchSchema = z.object({
  title: z.string().min(1).max(128).optional(),
  content: z.string().max(1024).optional(),
  location: z.string().max(128).optional(),
  day: z.number().int().min(1).max(7).optional(),
  startPeriod: z.number().int().min(1).max(10).optional(),
  endPeriod: z.number().int().min(1).max(10).optional(),
  weeksList: z.array(z.number().int().min(1)).optional(),
  colorIndex: scheduleColorIndex.optional(),
  updatedAt: iso,
});

const noteCreateSchema = z.object({
  id: uuid,
  courseId: z.string().min(1).max(128),
  content: z.string().min(1).max(2048),
  createdAt: iso,
  updatedAt: iso,
});

const notePatchSchema = z.object({
  content: z.string().min(1).max(2048).optional(),
  updatedAt: iso,
});

const todoCreateSchema = z.object({
  id: uuid,
  courseId: z.string().min(1).max(128),
  content: z.string().min(1).max(1024),
  status: z.enum(["pending", "done"]).default("pending"),
  dueDate: z.string().nullable().optional(),
  createdAt: iso,
  completedAt: z.string().nullable().optional(),
  updatedAt: iso,
});

const todoPatchSchema = z.object({
  content: z.string().min(1).max(1024).optional(),
  status: z.enum(["pending", "done"]).optional(),
  dueDate: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  updatedAt: iso,
});

const attendanceStatus = z.enum(["present", "late", "absent", "leave", "nocheck"]);

const attendanceUpsertSchema = z.object({
  id: uuid,
  courseId: z.string().min(1).max(128),
  week: z.number().int().min(1),
  day: z.number().int().min(1).max(7),
  status: attendanceStatus,
  createdAt: iso,
  updatedAt: iso,
});

const attendancePatchSchema = z.object({
  status: attendanceStatus.optional(),
  updatedAt: iso,
});

function notFound(): AppError {
  return new AppError(ErrorCodes.USER_NOT_FOUND, "记录不存在", 404);
}

// ===== Schedules =====

appCourseExtRouter.get(
  "/schedules",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const rows = await listSchedules(req.appAuth!.uid);
    ok(res, rows.map(toScheduleDto));
  }),
);

appCourseExtRouter.post(
  "/schedules",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const body = scheduleCreateSchema.parse(req.body);
    await insertSchedule(req.appAuth!.uid, {
      id: body.id,
      title: body.title,
      content: body.content,
      location: body.location,
      day: body.day,
      startPeriod: body.startPeriod,
      endPeriod: body.endPeriod,
      weeksListJson: JSON.stringify(body.weeksList),
      colorIndex: body.colorIndex ?? null,
      createdAt: body.createdAt,
      updatedAt: body.updatedAt,
    });
    ok(res, body);
  }),
);

appCourseExtRouter.patch(
  "/schedules/:id",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const body = schedulePatchSchema.parse(req.body);
    const ok2 = await updateSchedule(req.appAuth!.uid, id, {
      title: body.title,
      content: body.content,
      location: body.location,
      day: body.day,
      startPeriod: body.startPeriod,
      endPeriod: body.endPeriod,
      weeksListJson: body.weeksList ? JSON.stringify(body.weeksList) : undefined,
      colorIndex: body.colorIndex,
      updatedAt: body.updatedAt,
    });
    if (!ok2) throw notFound();
    ok(res, null);
  }),
);

appCourseExtRouter.delete(
  "/schedules/:id",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const uid = req.appAuth!.uid;
    const id = req.params.id;
    const deleted = await deleteSchedule(uid, id);
    // 幂等：实体已删也写 tombstone，便于 outbox flush / 跨设备传播
    await upsertTombstone(uid, "schedule", id, new Date().toISOString());
    if (!deleted) {
      // 仍返回 ok：delete 幂等（远程已无）
    }
    ok(res, null);
  }),
);

// ===== Notes =====

appCourseExtRouter.get(
  "/notes",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const courseId = typeof req.query.courseId === "string" ? req.query.courseId : undefined;
    const rows = await listNotes(req.appAuth!.uid, courseId);
    ok(res, rows.map(toNoteDto));
  }),
);

appCourseExtRouter.post(
  "/notes",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const body = noteCreateSchema.parse(req.body);
    await insertNote(req.appAuth!.uid, {
      id: body.id,
      courseId: body.courseId,
      content: body.content,
      createdAt: body.createdAt,
      updatedAt: body.updatedAt,
    });
    ok(res, body);
  }),
);

appCourseExtRouter.patch(
  "/notes/:id",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const body = notePatchSchema.parse(req.body);
    const ok2 = await updateNote(req.appAuth!.uid, req.params.id, {
      content: body.content,
      updatedAt: body.updatedAt,
    });
    if (!ok2) throw notFound();
    ok(res, null);
  }),
);

appCourseExtRouter.delete(
  "/notes/:id",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const uid = req.appAuth!.uid;
    const id = req.params.id;
    await deleteNote(uid, id);
    await upsertTombstone(uid, "note", id, new Date().toISOString());
    ok(res, null);
  }),
);

// ===== Todos =====

appCourseExtRouter.get(
  "/todos",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const courseId = typeof req.query.courseId === "string" ? req.query.courseId : undefined;
    const rows = await listTodos(req.appAuth!.uid, courseId);
    ok(res, rows.map(toTodoDto));
  }),
);

appCourseExtRouter.post(
  "/todos",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const body = todoCreateSchema.parse(req.body);
    await insertTodo(req.appAuth!.uid, {
      id: body.id,
      courseId: body.courseId,
      content: body.content,
      status: body.status,
      dueDate: body.dueDate ?? null,
      createdAt: body.createdAt,
      completedAt: body.completedAt ?? null,
      updatedAt: body.updatedAt,
    });
    ok(res, body);
  }),
);

appCourseExtRouter.patch(
  "/todos/:id",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const body = todoPatchSchema.parse(req.body);
    const ok2 = await updateTodo(req.appAuth!.uid, req.params.id, {
      content: body.content,
      status: body.status,
      dueDate: body.dueDate,
      completedAt: body.completedAt,
      updatedAt: body.updatedAt,
    });
    if (!ok2) throw notFound();
    ok(res, null);
  }),
);

appCourseExtRouter.delete(
  "/todos/:id",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const uid = req.appAuth!.uid;
    const id = req.params.id;
    await deleteTodo(uid, id);
    await upsertTombstone(uid, "todo", id, new Date().toISOString());
    ok(res, null);
  }),
);

// ===== Attendances =====

appCourseExtRouter.get(
  "/attendances",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const rows = await listAttendances(req.appAuth!.uid);
    ok(res, rows.map(toAttendanceDto));
  }),
);

appCourseExtRouter.post(
  "/attendances",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const body = attendanceUpsertSchema.parse(req.body);
    await upsertAttendance(req.appAuth!.uid, {
      id: body.id,
      courseId: body.courseId,
      week: body.week,
      day: body.day,
      status: body.status,
      createdAt: body.createdAt,
      updatedAt: body.updatedAt,
    });
    ok(res, body);
  }),
);

appCourseExtRouter.patch(
  "/attendances/:id",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const body = attendancePatchSchema.parse(req.body);
    const ok2 = await updateAttendance(req.appAuth!.uid, req.params.id, {
      status: body.status,
      updatedAt: body.updatedAt,
    });
    if (!ok2) throw notFound();
    ok(res, null);
  }),
);

appCourseExtRouter.delete(
  "/attendances/:id",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const uid = req.appAuth!.uid;
    const id = req.params.id;
    await deleteAttendance(uid, id);
    await upsertTombstone(uid, "attendance", id, new Date().toISOString());
    ok(res, null);
  }),
);

// ===== Tombstones =====

appCourseExtRouter.get(
  "/tombstones",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const rows = await listTombstones(req.appAuth!.uid);
    ok(res, rows.map(toTombstoneDto));
  }),
);
