/**
 * 开课目录提取模块
 * 负责从教务开课计划页面 (kai.asp) 提取课程汇总开课目录
 */

import { stripTags } from '../utils/html';

/**
 * 单条开课课程记录
 */
export interface KaikeItem {
  /** 序号 */
  index: string;
  /** 课程编号 */
  courseCode: string;
  /** 任课单位 */
  department: string;
  /** 课程代码+名称（如：形势与政策Ⅲ4222025_1） */
  courseIdWithName: string;
  /** 课程名称 */
  courseName: string;
  /** 课程性质（必修/选修/实践等） */
  courseType: string;
  /** 上课地点 */
  classroom: string;
  /** 上课时间（如：1-5,1-6） */
  scheduleTime: string;
  /** 教学周范围（如：10-13） */
  weekRange: string;
  /** 学分 */
  credits: string;
  /** 讲课学时 */
  lectureHours: string;
  /** 实验学时 */
  labHours: string;
  /** 实践学时 */
  practiceHours: string;
  /** 总学时 */
  totalHours: string;
  /** 授课教师 */
  teacher: string;
  /** 计划人数 */
  plannedCount: string;
  /** 已选人数 */
  selectedCount: string;
  /** 剩余容量 */
  remainingCount: string;
  /** 上课班级 */
  className: string;
  /** 是否锁定 */
  isLocked: string;
  /** 校区 */
  campus: string;
  /** 课程类别（通识必修/专业方向课等） */
  courseCategory: string;
  /** 课程体系（混教/理论等） */
  courseSystem: string;
  /** 排课类别 */
  scheduleType: string;
}

/**
 * 开课目录提取结果
 */
export interface KaikeResult {
  /** 学期（如：2025-2026-2） */
  semester: string;
  /** 课程列表 */
  courses: KaikeItem[];
}

export interface KaikeInfoResult {
  result: KaikeResult | null;
  success: boolean;
}

/**
 * 数据表格列索引定义
 *
 * 表格共 29 列（0-28），前 26 列为数据，后 3 列为操作链接
 */
const COL = {
  INDEX: 0,              // 序号
  COURSE_CODE: 1,        // 课程编号
  DEPARTMENT: 2,         // 任课单位
  COURSE_ID_WITH_NAME: 3,// 课程代码+名称
  COURSE_NAME: 4,        // 课程名称
  COURSE_TYPE: 5,        // 课程性质
  CLASSROOM: 6,          // 上课地点
  SCHEDULE_TIME: 7,      // 上课时间
  WEEK_RANGE: 8,         // 周次
  CREDITS: 9,            // 学分
  LECTURE_HOURS: 10,     // 讲课学时
  LAB_HOURS: 11,         // 实验学时
  PRACTICE_HOURS: 12,    // 实践学时
  TOTAL_HOURS: 13,       // 总学时
  TEACHER: 14,           // 教师
  PLANNED_COUNT: 15,     // 计划人数
  SELECTED_COUNT: 16,    // 已选人数
  REMAINING_COUNT: 17,   // 剩余容量
  CLASS_NAME: 18,        // 上课班级
  IS_LOCKED: 19,         // 锁定
  CAMPUS: 20,            // 校区
  COURSE_CATEGORY: 22,   // 课程类别
  COURSE_SYSTEM: 23,     // 课程体系
  SCHEDULE_TYPE: 24,     // 排课类别
} as const;

/** 列 21 为空，跳过 */

/**
 * 开课目录页基础 URL
 */
const KAIKE_URL = 'https://jiaowu.sicau.edu.cn/xuesheng/gongxuan/gongxuan/kai.asp?title_id1=2';

/**
 * 提取开课目录数据
 *
 * 解析开课目录页面的课程汇总开课目录表格：
 * - 标题行含学期信息
 * - 表头行以 g_column class 标识
 * - 数据行以 g_body_1 / g_body_2 class 标识，每个 td 对应一个字段
 *
 * @param html 开课计划页面的原始 HTML 字符串
 * @returns 包含学期和课程列表的结果对象
 *
 * @example
 * const { result, success } = extractKaikeInfo(html);
 * if (success) {
 *   console.log(result.semester, result.courses.length);
 * }
 */
export const extractKaikeInfo = (html: string): KaikeInfoResult => {
  if (!html || typeof html !== 'string' || html.includes('登录超时')) {
    return { result: null, success: false };
  }

  const semester = parseSemester(html);
  const courses = parseDataRows(html);

  return {
    result: { semester, courses },
    success: courses.length > 0,
  };
};

/**
 * 提取学期信息
 * 格式："2025-2026-2学期—课程汇总开课目录"
 */
function parseSemester(html: string): string {
  const match = html.match(/<td[^>]*class\s*=\s*"?g_title[^>]*>([\s\S]*?)<\/td>/i);
  if (match) {
    const title = stripTags(match[1]).trim();
    const semMatch = title.match(/(\d{4}-\d{4}-\d)/);
    if (semMatch) return semMatch[1];
  }
  return '';
}

/**
 * 解析所有数据行
 *
 * 匹配 class 为 g_body_1 或 g_body_2 的 <tr>，
 * 提取其中每个 <td> 的纯文本，跳过表头行。
 */
function parseDataRows(html: string): KaikeItem[] {
  // 匹配所有 g_body 数据行
  const rowRegex = /<tr[^>]*class\s*=\s*"?g_body_[12][^>]*>([\s\S]*?)<\/tr>/gi;
  const courses: KaikeItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = rowRegex.exec(html)) !== null) {
    const rowHtml = match[1];

    // 提取该行中所有 <td> 的纯文本
    const tdMatches = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
    const values = tdMatches.map((td) => stripTags(td).trim());

    // 至少需要 26 列数据
    if (values.length < 25) continue;

    const item: KaikeItem = {
      index: values[COL.INDEX],
      courseCode: values[COL.COURSE_CODE],
      department: values[COL.DEPARTMENT],
      courseIdWithName: values[COL.COURSE_ID_WITH_NAME],
      courseName: values[COL.COURSE_NAME],
      courseType: values[COL.COURSE_TYPE],
      classroom: cleanClassroom(values[COL.CLASSROOM]),
      scheduleTime: cleanScheduleTime(values[COL.SCHEDULE_TIME]),
      weekRange: values[COL.WEEK_RANGE],
      credits: values[COL.CREDITS],
      lectureHours: values[COL.LECTURE_HOURS],
      labHours: values[COL.LAB_HOURS],
      practiceHours: values[COL.PRACTICE_HOURS],
      totalHours: values[COL.TOTAL_HOURS],
      teacher: values[COL.TEACHER],
      plannedCount: values[COL.PLANNED_COUNT],
      selectedCount: values[COL.SELECTED_COUNT],
      remainingCount: values[COL.REMAINING_COUNT],
      className: values[COL.CLASS_NAME],
      isLocked: values[COL.IS_LOCKED],
      campus: values[COL.CAMPUS],
      courseCategory: values[COL.COURSE_CATEGORY],
      courseSystem: values[COL.COURSE_SYSTEM],
      scheduleType: values[COL.SCHEDULE_TYPE],
    };

    // 跳过空序号行或不完整的数据行
    if (item.index && /^\d+$/.test(item.index)) {
      courses.push(item);
    }
  }

  return courses;
}

/**
 * 清洗上课地点文本：移除 <br> 引入的换行
 */
function cleanClassroom(text: string): string {
  return text.replace(/\n/g, '').trim();
}

/**
 * 清洗上课时间文本：移除 <br> 引入的换行
 */
function cleanScheduleTime(text: string): string {
  return text.replace(/\n/g, '').trim();
}
