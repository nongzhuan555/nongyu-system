/** 教学周起止（含端点） */
export type WeekRange = {
  start: number;
  end: number;
};

/**
 * 课表条目（UI 契约；与教务 HTML 解耦）
 * day: 1=周一 … 7=周日；period: 1–10
 */
export type CourseEntry = {
  id: string;
  name: string;
  teacher: string;
  room: string;
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  startPeriod: number;
  endPeriod: number;
  weeks: WeekRange;
  /** 若存在则优先于 weeks 范围 */
  weeksList?: number[];
  odd: boolean;
  even: boolean;
};

/**
 * 自定义日程（独立实体，不复用 CourseEntry）
 * day: 1=周一 … 7=周日；period: 1–10
 */
export type ScheduleEntry = {
  id: string;
  studentId: string;
  title: string;
  content: string;
  location: string;
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  startPeriod: number;
  endPeriod: number;
  /** 出现在哪些周；空数组视为全周 */
  weeksList: number[];
  /** 色板下标 0–7；null / 缺省 = 旧版浅底默认样式 */
  colorIndex?: number | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * 课程备注（按 courseId 绑定 CourseEntry.id 或 ScheduleEntry.id）
 */
export type CourseNote = {
  id: string;
  studentId: string;
  courseId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * 课程待办（按 courseId 绑定）
 */
export type CourseTodo = {
  id: string;
  studentId: string;
  courseId: string;
  content: string;
  status: "pending" | "done";
  dueDate?: string | null;
  createdAt: string;
  completedAt: string | null;
  updatedAt: string;
};

/** 考勤五态：签到 / 迟到 / 缺勤 / 请假 / 未考勤（老师未检查本节） */
export type AttendanceStatus = "present" | "late" | "absent" | "leave" | "nocheck";

/**
 * 课程考勤（按课程实例：courseId + 教学周 + 星期）
 */
export type CourseAttendance = {
  id: string;
  studentId: string;
  courseId: string;
  week: number;
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  status: AttendanceStatus;
  createdAt: string;
  updatedAt: string;
};

/** 同格堆叠项：课程或日程 */
export type StackItem =
  | { type: "course"; course: CourseEntry }
  | { type: "schedule"; schedule: ScheduleEntry };

/**
 * 同格堆叠主格（有课则 items[0] 为课程；日程按 createdAt 升序）
 */
export type GridStack = {
  kind: "stack";
  items: StackItem[];
  spanRows: number;
};

/** @deprecated 构建已统一为 stack；保留类型兼容旧引用 */
export type GridPrimary = {
  kind: "primary";
  course: CourseEntry;
  spanRows: number;
};

/** @deprecated 构建已统一为 stack */
export type GridSchedule = {
  kind: "schedule";
  schedule: ScheduleEntry;
  spanRows: number;
};

/** 被连堂占用的占位格 */
export type GridOccupied = {
  kind: "occupied";
  primaryRow: number;
};

export type GridCell = GridStack | GridOccupied | null;

/** 单周：5 行大课区间 × 7 列 */
export type WeekGridData = GridCell[][];

export type CourseColor = {
  bg: string;
  text: string;
};
