/**
 * 农屿课表扩展工具集 — Agent Tool 封装
 *
 * 自定义日程 / 课程备注 / 课程待办的 CRUD，供 createAgent() 使用。
 * 读操作走 repository 的本地优先 + pull 远程同步；写操作走 repository（本地优先 + 推远程）。
 */
import { z } from "zod";
import { tool } from "nongyu-agent-sdk";
import { useSessionStore } from "@/stores/session";
import { newCourseExtId } from "../model/genId";
import type { CourseNote, CourseTodo } from "../model/types";
import {
  addNote,
  addSchedule,
  addTodo,
  editNote,
  editSchedule,
  editTodo,
  loadLocalCourseExt,
  pullCourseExt,
  removeNote,
  removeSchedule,
  removeTodo,
} from "../data/courseExtRepository";
import { listTodosApi } from "../data/courseExtApi";

function getStudentId(): string {
  const sid = useSessionStore.getState().profile?.studentId;
  if (!sid) throw new Error("未登录，无法操作课表扩展数据");
  return sid;
}

const daySchema = z.number().int().min(1).max(7).describe("星期几，1=周一 … 7=周日");
const periodSchema = z.number().int().min(1).max(10).describe("节次，1–10");

// ===== 自定义日程 =====

export const listSchedulesTool = tool({
  name: "course_schedule_list",
  description:
    "查询当前学生的全部自定义日程。返回日程数组（标题、地点、备注、星期、节次、教学周）。结果会以自定义日程卡片展示。",
  inputSchema: z.object({}),
  render: { component: "CourseScheduleCard" },
  async execute() {
    const studentId = getStudentId();
    try {
      const snapshot = await pullCourseExt(studentId);
      return snapshot.schedules;
    } catch {
      return loadLocalCourseExt(studentId).schedules;
    }
  },
});

export const createScheduleTool = tool({
  name: "course_schedule_create",
  description:
    "为当前学生新增一条自定义日程。需提供标题、星期、起止节次；地点与备注可选；weeksList 留空表示全周。",
  inputSchema: z.object({
    title: z.string().min(1).max(128).describe("日程标题"),
    location: z.string().max(128).optional().describe("地点，可选"),
    content: z.string().max(1024).optional().describe("备注，可选"),
    day: daySchema,
    startPeriod: periodSchema,
    endPeriod: periodSchema,
    weeksList: z.array(z.number().int().min(1)).optional().describe("教学周列表，留空=全周"),
  }),
  async execute(args) {
    const studentId = getStudentId();
    const now = new Date().toISOString();
    const entry = {
      id: newCourseExtId(),
      studentId,
      title: args.title,
      content: args.content ?? "",
      location: args.location ?? "",
      day: args.day as 1 | 2 | 3 | 4 | 5 | 6 | 7,
      startPeriod: args.startPeriod,
      endPeriod: args.endPeriod,
      weeksList: args.weeksList ?? [],
      createdAt: now,
      updatedAt: now,
    };
    await addSchedule(studentId, entry);
    return { ok: true, id: entry.id };
  },
});

export const updateScheduleTool = tool({
  name: "course_schedule_update",
  description: "更新指定 id 的自定义日程。仅需传要修改的字段；updatedAt 由工具自动填充。",
  inputSchema: z.object({
    id: z.string().describe("日程 id"),
    title: z.string().min(1).max(128).optional(),
    location: z.string().max(128).optional(),
    content: z.string().max(1024).optional(),
    day: daySchema.optional(),
    startPeriod: periodSchema.optional(),
    endPeriod: periodSchema.optional(),
    weeksList: z.array(z.number().int().min(1)).optional(),
  }),
  async execute(args) {
    const studentId = getStudentId();
    const { id, day, ...rest } = args;
    await editSchedule(studentId, id, {
      ...rest,
      day: day as 1 | 2 | 3 | 4 | 5 | 6 | 7 | undefined,
      updatedAt: new Date().toISOString(),
    });
    return { ok: true };
  },
});

export const deleteScheduleTool = tool({
  name: "course_schedule_delete",
  description: "删除指定 id 的自定义日程。",
  inputSchema: z.object({
    id: z.string().describe("日程 id"),
  }),
  async execute({ id }) {
    const studentId = getStudentId();
    await removeSchedule(studentId, id);
    return { ok: true };
  },
});

// ===== 课程备注 =====

export const listNotesTool = tool({
  name: "course_note_list",
  description:
    "查询当前学生的课程备注。可按 courseId 过滤；不传 courseId 返回全部备注。结果会以课程备注卡片展示。",
  inputSchema: z.object({
    courseId: z.string().optional().describe("课程 id；不传则返回全部"),
  }),
  render: { component: "CourseNoteCard" },
  async execute({ courseId }) {
    const studentId = getStudentId();
    let notes: CourseNote[];
    try {
      const snapshot = await pullCourseExt(studentId);
      notes = snapshot.notes;
    } catch {
      notes = loadLocalCourseExt(studentId).notes;
    }
    return courseId ? notes.filter((n) => n.courseId === courseId) : notes;
  },
});

export const createNoteTool = tool({
  name: "course_note_create",
  description: "为指定课程新增一条备注。",
  inputSchema: z.object({
    courseId: z.string().describe("课程 id（教务课稳定 id 或日程 id）"),
    content: z.string().min(1).max(2048).describe("备注内容"),
  }),
  async execute({ courseId, content }) {
    const studentId = getStudentId();
    const now = new Date().toISOString();
    await addNote(studentId, {
      id: newCourseExtId(),
      studentId,
      courseId,
      content,
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true };
  },
});

export const updateNoteTool = tool({
  name: "course_note_update",
  description: "更新指定 id 的备注内容。",
  inputSchema: z.object({
    id: z.string().describe("备注 id"),
    content: z.string().min(1).max(2048).describe("新内容"),
  }),
  async execute({ id, content }) {
    const studentId = getStudentId();
    await editNote(studentId, id, { content, updatedAt: new Date().toISOString() });
    return { ok: true };
  },
});

export const deleteNoteTool = tool({
  name: "course_note_delete",
  description: "删除指定 id 的备注。",
  inputSchema: z.object({
    id: z.string().describe("备注 id"),
  }),
  async execute({ id }) {
    const studentId = getStudentId();
    await removeNote(studentId, id);
    return { ok: true };
  },
});

// ===== 课程待办 =====

export const listTodosTool = tool({
  name: "course_todo_list",
  description:
    "查询当前学生的课程待办。可按 courseId 过滤；不传 courseId 返回全部待办。结果会以课程待办卡片展示。",
  inputSchema: z.object({
    courseId: z.string().optional().describe("课程 id；不传则返回全部"),
  }),
  render: { component: "CourseTodoCard" },
  async execute({ courseId }) {
    const studentId = getStudentId();
    let todos: CourseTodo[];
    try {
      const snapshot = await pullCourseExt(studentId);
      todos = snapshot.todos;
    } catch {
      todos = loadLocalCourseExt(studentId).todos;
    }
    return courseId ? todos.filter((t) => t.courseId === courseId) : todos;
  },
});

export const createTodoTool = tool({
  name: "course_todo_create",
  description: "为指定课程新增一条待办。",
  inputSchema: z.object({
    courseId: z.string().describe("课程 id"),
    content: z.string().min(1).max(1024).describe("待办内容"),
    dueDate: z.string().nullable().optional().describe("截止日期，可选"),
  }),
  async execute({ courseId, content, dueDate }) {
    const studentId = getStudentId();
    const now = new Date().toISOString();
    await addTodo(studentId, {
      id: newCourseExtId(),
      studentId,
      courseId,
      content,
      status: "pending",
      dueDate: dueDate ?? null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true };
  },
});

export const updateTodoTool = tool({
  name: "course_todo_update",
  description: "更新指定 id 的待办。可改内容、状态、截止日期；completedAt 由工具按状态自动填充。",
  inputSchema: z.object({
    id: z.string().describe("待办 id"),
    content: z.string().min(1).max(1024).optional(),
    status: z.enum(["pending", "done"]).optional(),
    dueDate: z.string().nullable().optional(),
  }),
  async execute(args) {
    const studentId = getStudentId();
    const { id, content, status, dueDate } = args;
    const now = new Date().toISOString();
    await editTodo(studentId, id, {
      content,
      status,
      dueDate,
      completedAt: status === "done" ? now : status === "pending" ? null : undefined,
      updatedAt: now,
    });
    return { ok: true };
  },
});

export const toggleTodoTool = tool({
  name: "course_todo_toggle",
  description: "切换指定 id 待办的完成状态（pending↔done）。",
  inputSchema: z.object({
    id: z.string().describe("待办 id"),
  }),
  async execute({ id }) {
    const studentId = getStudentId();
    const all = await listTodosApi();
    const t = all.find((x) => x.id === id);
    if (!t) throw new Error("待办不存在");
    const next = t.status === "done" ? "pending" : "done";
    const now = new Date().toISOString();
    await editTodo(studentId, id, {
      status: next,
      completedAt: next === "done" ? now : null,
      updatedAt: now,
    });
    return { ok: true, status: next };
  },
});

export const deleteTodoTool = tool({
  name: "course_todo_delete",
  description: "删除指定 id 的待办。",
  inputSchema: z.object({
    id: z.string().describe("待办 id"),
  }),
  async execute({ id }) {
    const studentId = getStudentId();
    await removeTodo(studentId, id);
    return { ok: true };
  },
});

export const courseExtSnapshotTool = tool({
  name: "course_ext_snapshot",
  description:
    "一次性查询当前学生的全部课表扩展数据（自定义日程 + 课程备注 + 课程待办），用于快速获取全貌。结果会以课表扩展快照卡片展示。",
  inputSchema: z.object({}),
  render: { component: "CourseExtSnapshotCard" },
  async execute() {
    const studentId = getStudentId();
    try {
      return await pullCourseExt(studentId);
    } catch {
      return loadLocalCourseExt(studentId);
    }
  },
});

/**
 * 课表扩展工具集合（14 个），供 agent.ts 注册
 */
export const courseExtTools = {
  course_schedule_list: listSchedulesTool,
  course_schedule_create: createScheduleTool,
  course_schedule_update: updateScheduleTool,
  course_schedule_delete: deleteScheduleTool,
  course_note_list: listNotesTool,
  course_note_create: createNoteTool,
  course_note_update: updateNoteTool,
  course_note_delete: deleteNoteTool,
  course_todo_list: listTodosTool,
  course_todo_create: createTodoTool,
  course_todo_update: updateTodoTool,
  course_todo_toggle: toggleTodoTool,
  course_todo_delete: deleteTodoTool,
  course_ext_snapshot: courseExtSnapshotTool,
};
