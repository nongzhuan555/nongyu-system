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

/** 连堂主格 */
export type GridPrimary = {
  kind: "primary";
  course: CourseEntry;
  /** 向下合并的大课区间行数（≥1） */
  spanRows: number;
};

/** 自定义日程主格 */
export type GridSchedule = {
  kind: "schedule";
  schedule: ScheduleEntry;
  /** 向下合并的大课区间行数（≥1） */
  spanRows: number;
};

/** 被连堂占用的占位格 */
export type GridOccupied = {
  kind: "occupied";
  primaryRow: number;
};

export type GridCell = GridPrimary | GridSchedule | GridOccupied | null;

/** 单周：5 行大课区间 × 7 列 */
export type WeekGridData = GridCell[][];

export type CourseColor = {
  bg: string;
  text: string;
};
