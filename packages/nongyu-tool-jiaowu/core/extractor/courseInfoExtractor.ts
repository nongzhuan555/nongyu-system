/**
 * 课表信息提取模块
 * 负责从课表查询页面提取学生的本学期课程安排
 */

import { parseTable } from '../utils/html';

/**
 * 课表信息项定义
 */
export interface CourseItem {
  campus?: string;          // 校区
  courseName?: string;      // 课程名称
  courseId?: string;        // 课程编号
  weeks?: string;           // 周次（如：1-16）
  classroom?: string;       // 上课教室
  scheduleTime?: string;    // 上课时间（如：3-3,3-4）
  credit?: string;          // 学分
  hours?: string;           // 学时
  weeklyHours?: string;     // 周学时
  labHours?: string;        // 实验周学时
  assessmentMethod?: string;// 考核方法
  teacher?: string;         // 任课教师
  enrollmentType?: string;  // 选课方式（如：初修）
  blendedTeaching?: string; // 混合式教学
}

/**
 * 课表提取结果接口
 */
export interface CourseResult {
  result: CourseItem[]; // 课程列表
  success: boolean;     // 提取状态
}

/**
 * 课表信息提取器
 *
 * 核心逻辑：
 * 1. 通过表头关键字定位课表
 * 2. 自动识别各列索引
 * 3. 遍历数据行，清洗并提取每门课程信息
 *
 * @param html 原始 HTML 字符串内容
 * @returns 清洗后的课表结果对象
 *
 * @example
 * const result = extractCourseInfo(html);
 * if (result.success) {
 *   console.log(`本学期共 ${result.result.length} 门课程`);
 * }
 */
export const extractCourseInfo = (html: string): CourseResult => {
  // 基础内容校验
  if (!html || typeof html !== 'string') {
    return { result: [], success: false };
  }

  // 1. 用非贪婪正则提取所有表格 HTML 片段（与旧代码一致，避免 extractSegments 的深度嵌套问题）
  const tableMatches = html.match(/<table[\s\S]*?<\/table>/gi);
  const tableHtmls = tableMatches ? Array.from(tableMatches) : [];
  const grids = tableHtmls
    .sort((a, b) => b.length - a.length)
    .map((t) => parseTable(t))
    .filter((g) => g.length >= 2);

  // 2. 遍历每个表格，尝试提取课程数据，取第一个有结果的
  for (const grid of grids) {
    const header = grid.find((row) => row.some((cell) => cell)) || [];
    const cols = detectColumns(header);

    // 必须有课程名称列才可能是课表
    if (cols.courseName < 0) continue;

    const items: CourseItem[] = [];
    const headerIndex = grid.indexOf(header);

    for (let i = headerIndex + 1; i < grid.length; i++) {
      const row = grid[i];
      const item: CourseItem = {
        campus: pickCell(row, cols.campus),
        courseName: pickCell(row, cols.courseName),
        courseId: pickCell(row, cols.courseId),
        weeks: pickCell(row, cols.weeks),
        classroom: pickCell(row, cols.classroom),
        scheduleTime: pickCell(row, cols.scheduleTime),
        credit: pickCell(row, cols.credit),
        hours: pickCell(row, cols.hours),
        weeklyHours: pickCell(row, cols.weeklyHours),
        labHours: pickCell(row, cols.labHours),
        assessmentMethod: pickCell(row, cols.assessmentMethod),
        teacher: pickCell(row, cols.teacher),
        enrollmentType: pickCell(row, cols.enrollmentType),
        blendedTeaching: pickCell(row, cols.blendedTeaching),
      };

      if (item.courseName) {
        items.push(item);
      }
    }

    if (items.length > 0) {
      return { result: items, success: true };
    }
  }

  return { result: [], success: false };
};

/**
 * 识别表头对应的列索引
 * 处理教务系统可能存在的列顺序变动
 */
function detectColumns(header: string[]): Record<string, number> {
  // 规范化表头文字：移除空白符、冒号，并转为小写
  const normalized = header.map((h) =>
    h.replace(/\s+/g, '').replace(/：|:/g, '').toLowerCase(),
  );
  const findIdx = (keywords: string[]) =>
    normalized.findIndex((h) => keywords.some((k) => h.includes(k)));

  return {
    campus: findIdx(['校区']),
    courseName: findIdx(['课程名称', '课程名', '课程']),
    courseId: findIdx(['编号', '课程编号']),
    weeks: findIdx(['周次', '上课周次']),
    classroom: findIdx(['教室', '上课教室']),
    scheduleTime: findIdx(['上课时间', '时间']),
    credit: findIdx(['学分']),
    hours: findIdx(['学时']),
    weeklyHours: findIdx(['周学时']),
    labHours: findIdx(['实验周学时']),
    assessmentMethod: findIdx(['考核方法', '考核方式']),
    teacher: findIdx(['教师', '任课教师']),
    enrollmentType: findIdx(['选课方式']),
    blendedTeaching: findIdx(['混合式教学']),
  };
}

/**
 * 安全提取单元格内容
 *
 * @param row 行数据数组
 * @param index 列索引
 * @returns 单元格文本或空字符串
 */
function pickCell(row: string[], index: number): string {
  if (index < 0 || index >= row.length) return '';
  return (row[index] || '').trim();
}
