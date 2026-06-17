/**
 * 培养方案提取模块
 * 负责从教务培养方案页面 (jjihua.asp) 提取课程列表
 */

import { stripTags } from '../utils/html';

/**
 * 单门课程信息
 */
export interface PlanCourse {
  /** 课程编号 */
  courseCode: string;
  /** 课程名称 */
  courseName: string;
  /** 英文名称 */
  englishName: string;
  /** 课程性质（必修/实践教学/专业方向课等） */
  courseType: string;
  /** 课程体系（专业基础课/公共基础课等） */
  courseSystem: string;
  /** 学分 */
  credits: string;
  /** 总学时 */
  totalHours: string;
  /** 讲课学时 */
  lectureHours: string;
  /** 实验学时 */
  labHours: string;
  /** 实践学时 */
  practiceHours: string;
  /** 自学学时 */
  selfStudyHours: string;
  /** 各学期周学时 (索引 0=第一学期, 最多 10 学期) */
  weeklyHours: string[];
  /** 执行学期 */
  execSemester: string;
}

/**
 * 培养方案提取结果
 */
export interface PlanInfo {
  /** 方案标题（如：物联网工程2023） */
  title: string;
  /** 课程列表 */
  courses: PlanCourse[];
}

/**
 * 培养方案提取结果接口
 */
export interface PlanInfoResult {
  result: PlanInfo | null;
  success: boolean;
}

/**
 * 培养方案提取器
 * 
 * 解析 jjihua.asp 页面的 tablebody 表格：
 * - 标题行 (class=g_title) 为方案名称
 * - 表头行 (class=g_column) 定义 24 列字段
 * - 数据行 (class=g_body_2) 为每门课程的详细信息
 * - 数据行 (class=g_body_1) 为交替行样式，结构相同
 *
 * @param html 原始 HTML 字符串
 * @returns 包含方案标题和课程列表的结果对象
 */
export const extractPlanInfo = (html: string): PlanInfoResult => {
  if (!html || typeof html !== 'string' || html.includes('登录超时')) {
    return { result: null, success: false };
  }

  const title = parseTitle(html);
  const courses = parseTablebodyRows(html);

  return { result: { title, courses }, success: courses.length > 0 };
};

/**
 * 从页面中提取方案标题
 * 匹配 class=g_title 的 td 内容
 */
function parseTitle(html: string): string {
  const titleMatch = html.match(/class\s*=\s*"?g_title[^>]*>([\s\S]*?)<\/td>/i);
  return titleMatch ? stripTags(titleMatch[1]) : '';
}

/**
 * 将同一个 html 输入解析为独立的每页课程数组
 * 合并多页 HTML 时各页独立调用此函数后合并结果即可
 *
 * 注意：表头行可能包含嵌套 &lt;/table&gt;（如排序链接中的内嵌图标），
 * 因此不能直接用 /&lt;table.*?&lt;\/table&gt;/ 截取整个表格，
 * 改为直接在全局 HTML 上匹配 g_body_[12] 数据行。
 */
function parseTablebodyRows(html: string): PlanCourse[] {
  // 确认 tablebody 表格存在（仅用于校验）
  if (!/<table[^>]*class\s*=\s*"?tablebody/i.test(html)) return [];

  // 在全局 HTML 上直接匹配所有数据行（g_body_2 / g_body_1）
  // 数据行内不存在嵌套 </table>，安全使用全局非贪婪匹配
  const bodyRowRegex = /<tr[^>]*class\s*=\s*"?g_body_[12][^>]*>([\s\S]*?)<\/tr>/gi;
  const rows: PlanCourse[] = [];
  let bodyMatch: RegExpExecArray | null;

  while ((bodyMatch = bodyRowRegex.exec(html)) !== null) {
    const rowHtml = bodyMatch[1];
    const rowCells = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
    const values = rowCells.map((cell) => stripTags(cell));

    // 起始索引 1 跳过序号列
    const course = mapRowToCourse(values, 1);
    if (course) {
      rows.push(course);
    }
  }

  return rows;
}

/**
 * 将一行单元格值映射为 PlanCourse 对象
 * 表头从 startIdx 开始（跳过序号等前缀列）：
 * 0:序  1:课程编号  2:课程名称  3:英文名称  4:课程性质  5:课程体系
 * 6:学分  7:总学时  8:讲课  9:实验  10:实践  11:自学
 * 12-21: 一~十学期周学时
 * 22:执行学期  23:课程简介
 */
function mapRowToCourse(values: string[], startIdx: number): PlanCourse | null {
  if (values.length <= startIdx) return null;

  const courseCode = values[startIdx]?.trim() || '';
  if (!courseCode) return null;

  // 周学时：索引 12~21（一~十学期），从 startIdx 偏移
  const weeklyHoursStart = startIdx + 11;
  const weeklyHours: string[] = [];
  for (let i = 0; i < 10; i++) {
    weeklyHours.push(values[weeklyHoursStart + i]?.trim() || '');
  }

  return {
    courseCode,
    courseName: values[startIdx + 1]?.trim() || '',
    englishName: values[startIdx + 2]?.trim() || '',
    courseType: values[startIdx + 3]?.trim() || '',
    courseSystem: values[startIdx + 4]?.trim() || '',
    credits: values[startIdx + 5]?.trim() || '',
    totalHours: values[startIdx + 6]?.trim() || '',
    lectureHours: values[startIdx + 7]?.trim() || '',
    labHours: values[startIdx + 8]?.trim() || '',
    practiceHours: values[startIdx + 9]?.trim() || '',
    selfStudyHours: values[startIdx + 10]?.trim() || '',
    weeklyHours,
    execSemester: values[startIdx + 21]?.trim() || '',
  };
}

/**
 * 合并多个 HTML 页面提取的课程列表
 * 去重依据：课程编号
 */
export const mergePlanCourses = (courseLists: PlanCourse[][]): PlanCourse[] => {
  const seen = new Set<string>();
  const result: PlanCourse[] = [];

  for (const courses of courseLists) {
    for (const course of courses) {
      if (!seen.has(course.courseCode)) {
        seen.add(course.courseCode);
        result.push(course);
      }
    }
  }

  return result;
};
