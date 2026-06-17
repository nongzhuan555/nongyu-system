/**
 * 教室课程信息提取模块
 * 负责从教务教室课表详情页 (kbjshi_new.asp) 提取指定教室的课程安排
 */

import { stripTags } from '../utils/html';

/**
 * 单条教室课程记录（一门课在某时间段的安排）
 */
export interface ClassroomCourseItem {
  /** 课程名称 */
  courseName: string;
  /** 授课教师 */
  teacher: string;
  /** 教学周范围（如：1-16） */
  weekRange: string;
  /** 上课人数 */
  studentCount: string;
  /** 课程性质（必修/选修等） */
  courseType: string;
  /** 单双周标识：空=全周, 双=双周, 单=单周 */
  weekPattern: string;
}

/**
 * 课表中的一个格子（某天某节次的课程列表）
 */
export interface ClassroomCourseSlot {
  /** 星期几（1-7，对应星期一~星期日） */
  dayOfWeek: number;
  /** 时段名称（上午/下午/晚上） */
  period: string;
  /** 节次名称（12节/34节/56节/78节/910节） */
  slot: string;
  /** 该格内的课程列表 */
  courses: ClassroomCourseItem[];
}

/**
 * 教室课程信息提取结果
 */
export interface ClassroomCourseResult {
  /** 教室名称 */
  classroomName: string;
  /** 学期标题（如：2025-2026-2） */
  semester: string;
  /** 所有课程槽位 */
  slots: ClassroomCourseSlot[];
}

export interface ClassroomCourseInfoResult {
  result: ClassroomCourseResult | null;
  success: boolean;
}

/**
 * 星期映射：索引 -> 中文名
 */
const DAY_NAMES = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];

/**
 * 教室课程信息提取器
 *
 * 解析 kbjshi_new.asp 的课表表格：
 * - 标题行含教室名称和学期
 * - 上午(12/34节)、下午(56/78节)、晚上(910节) 共5行
 * - 每行7列对应星期一~星期日
 * - 格内多门课以 &nbsp; 分隔
 *
 * @param html 原始 HTML 字符串
 * @returns 教室课程结果
 */
export const extractClassroomCourseInfo = (html: string): ClassroomCourseInfoResult => {
  if (!html || typeof html !== 'string' || html.includes('登录超时')) {
    return { result: null, success: false };
  }

  const { classroomName, semester } = parseTitle(html);
  const slots = parseCourseTable(html);

  return {
    result: { classroomName, semester, slots },
    success: slots.length > 0,
  };
};

/**
 * 提取标题中的教室名称和学期
 * 格式："四川农业大学2025-2026-2课程表(操场1)"
 */
function parseTitle(html: string): { classroomName: string; semester: string } {
  const titleMatch = html.match(/课程表\s*\(([^)]+)\)/);
  const classroomName = titleMatch ? titleMatch[1].trim() : '';

  const semMatch = html.match(/四川农业大学\s*(\d{4}-\d{4}-\d)\s*课程表/);
  const semester = semMatch ? semMatch[1] : '';

  return { classroomName, semester };
}

/**
 * 定位课表表格并解析所有课程槽位
 *
 * 表格结构：
 *   <tr>时间 | 星期一 | ... | 星期日 (header)
 *   <tr>上午 rowspan=2 | 12节 | Mon | ... | Sun
 *   <tr>34节 | Mon | ... | Sun
 *   <tr>下午 rowspan=2 | 56节 | Mon | ... | Sun
 *   <tr>78节 | Mon | ... | Sun
 *   <tr>晚上 rowspan=1 | 910节 | Mon | ... | Sun
 */
function parseCourseTable(html: string): ClassroomCourseSlot[] {
  // 定位课表表格：包含课程表标题的那个 bordered 表格
  const tableMatch = html.match(
    /课程表[^<]*<[^>]*>[\s\S]*?<table[^>]*border\s*=\s*"?1[^>]*>([\s\S]*?)<\/table>/i
  );
  if (!tableMatch) return [];

  const tableHtml = tableMatch[1];

  // 提取所有 TR
  const trMatches = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
  const slots: ClassroomCourseSlot[] = [];
  let currentPeriod = '';

  // 跳过表头行（第一行含"星期一"）
  for (let i = 1; i < trMatches.length; i++) {
    const trHtml = trMatches[i];
    const tds = trHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];

    // 检查是否有 rowspan 的时段 td（如 rowspan=2>上午）
    const firstTdContent = tds[0] || '';
    const periodMatch = firstTdContent.match(/rowspan[^>]*>([\s\S]*?)</i);
    if (periodMatch) {
      currentPeriod = stripTags(periodMatch[1]).trim();
    }

    // 确定节次标识：有 rowspan 时 targetTd=tds[1]，否则 targetTd=tds[0]
    const slotTdIdx = periodMatch ? 1 : 0;
    const slotTdContent = tds[slotTdIdx] || '';
    const slotText = stripTags(slotTdContent).replace(/\s+/g, '').trim();

    // 跳过非节次行（如表头）
    if (!slotText.includes('节')) continue;

    // 课程列从 slotTdIdx+1 开始，共7列
    const courseStart = slotTdIdx + 1;

    for (let d = 0; d < 7; d++) {
      const cellIdx = courseStart + d;
      if (cellIdx >= tds.length) break;

      const cellCourses = parseCellCourses(tds[cellIdx]);
      if (cellCourses.length > 0) {
        slots.push({
          dayOfWeek: d + 1,
          period: currentPeriod,
          slot: slotText,
          courses: cellCourses,
        });
      }
    }
  }

  return slots;
}

/**
 * 解析单个表格单元格中的课程列表
 *
 * 格内多门课的结构（stripTags 后）：
 *   课程名\n教师名(单/双)\n(空行)\nN-M周\nN人\n课程性质\n
 *   课程名\n教师名(单/双)\n(空行)\nN-M周\nN人\n课程性质\n
 *   ...
 *
 * 每门课的关键字段固定为 5 个有意义行：
 *   [0] 课程名、[1] 教师、[2] 周范围、[3] 人数、[4] 课程性质
 * 课程之间没有固定的分隔符，通过字段特征行来定位。
 */
function parseCellCourses(cellHtml: string): ClassroomCourseItem[] {
  const text = stripTags(cellHtml).trim();
  if (!text) return [];

  // 提取所有非空行
  const allLines = text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  // 筛选出候选行：包含有意义内容的行
  // 课程名：不是纯数字，不是 N-M 周格式，不是 N人 格式，不是课程性质
  // 教师行：可能含 (单)/(双)
  // 周范围：N-M 格式（后面可能跟"周"）
  // 人数：N人
  // 课程性质：必修/选修等
  const isWeekRange = (s: string) => /^\d+[-~]\d+/.test(s);
  const isStudentCount = (s: string) => /^\d+人?$/.test(s);
  const isCourseType = (s: string) =>
    ['必修', '选修', '限选', '任选', '公选'].some((t) => s === t || s.startsWith(t));
  const isTeacherLine = (s: string) => /[（(](单|双)[）)]/.test(s);

  const courses: ClassroomCourseItem[] = [];
  let i = 0;

  while (i < allLines.length) {
    // 跳过非课程名开头的行
    if (isWeekRange(allLines[i]) || isStudentCount(allLines[i]) || isCourseType(allLines[i])) {
      i++;
      continue;
    }

    const courseName = allLines[i];

    // 往前找教师（课程名后一行可能是教师，但也可能中间有空行）
    let teacher = '';
    let weekPattern = '';
    let teacherIdx = i + 1;
    if (teacherIdx < allLines.length && isTeacherLine(allLines[teacherIdx])) {
      const raw = allLines[teacherIdx];
      const m = raw.match(/[（(](单|双)[）)]/);
      weekPattern = m ? m[1] : '';
      teacher = raw.replace(/[（(][单双][）)]/, '').trim();
    } else if (teacherIdx < allLines.length && !isWeekRange(allLines[teacherIdx]) && !isStudentCount(allLines[teacherIdx]) && !isCourseType(allLines[teacherIdx])) {
      // 教师行可能没有 (单)/(双)
      teacher = allLines[teacherIdx];
    }

    // 在后面行中找周范围、人数、课程性质
    let weekRange = '';
    let studentCount = '';
    let courseType = '';
    const searchStart = teacher ? teacherIdx + 1 : i + 1;

    for (let j = searchStart; j < allLines.length; j++) {
      const line = allLines[j];
      if (!weekRange && isWeekRange(line)) {
        weekRange = line.replace('周', '').trim();
      } else if (!studentCount && isStudentCount(line)) {
        studentCount = line.replace('人', '');
      } else if (!courseType && isCourseType(line)) {
        courseType = line;
        // 找到课程性质就说明这⻔课解析完毕
        i = j + 1;
        break;
      }
    }

    // 内层循环未找到 courseType（循环自然结束未 break），
    // 说明此行不是课程数据，跳过当前行防止死循环
    if (!courseType) {
      i++;
      continue;
    }

    if (courseName && !isWeekRange(courseName) && !isStudentCount(courseName)) {
      courses.push({ courseName, teacher, weekRange, studentCount, courseType, weekPattern });
    } else {
      i++;
    }
  }

  return courses;
}

/**
 * 将课表槽位按星期分组的工具函数
 */
export const groupByDay = (
  slots: ClassroomCourseSlot[]
): Record<number, ClassroomCourseSlot[]> => {
  const grouped: Record<number, ClassroomCourseSlot[]> = {};
  for (const s of slots) {
    if (!grouped[s.dayOfWeek]) grouped[s.dayOfWeek] = [];
    grouped[s.dayOfWeek].push(s);
  }
  return grouped;
};

/**
 * 获取指定星期几的课程列表（1-7）
 */
export const getCoursesByDay = (
  slots: ClassroomCourseSlot[],
  dayOfWeek: number
): ClassroomCourseSlot[] => {
  return slots.filter((s) => s.dayOfWeek === dayOfWeek);
};
