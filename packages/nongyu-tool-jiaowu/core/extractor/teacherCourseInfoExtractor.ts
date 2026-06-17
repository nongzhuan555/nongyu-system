/**
 * 教师课表信息提取模块
 * 负责从教师课表页面提取教师的课程安排
 *
 * 与教室课表 (classroomCourseInfoExtractor) 共用相同的表格解析逻辑，
 * 区别在于单元格内课程内容的格式不同：
 * - 教室课表：课程名\n教师(单/双)\nN-M周\nN人\n课程性质
 * - 教师课表：课程名_性质_班号\n(实验)\n校区：教室\nN-M周(单周/连堂)
 *   多门课以 ---- 分隔
 */

import { stripTags } from '../utils/html';

/**
 * 教师课表中的一门课程
 */
export interface TeacherCourseItem {
  /** 课程名称 */
  courseName: string;
  /** 课程性质（如：必修、专业方向课），从课程名字段解析 */
  courseType: string;
  /** 班级/分组编号 */
  classId: string;
  /** 上课地点（如：雅安校区：10-B410室） */
  location: string;
  /** 教学周范围（如：9-14） */
  weekRange: string;
  /** 单双周标识：空=全周, 单=单周, 双=双周 */
  weekPattern: string;
  /** 是否为实验课 */
  isExperiment: boolean;
  /** 是否连堂（占用连续节次） */
  isContinuous: boolean;
  /** 学时标识（如：2学时） */
  hoursUnit: string;
}

/**
 * 教师课表中的一个槽位
 */
export interface TeacherCourseSlot {
  /** 星期几（1-7） */
  dayOfWeek: number;
  /** 时段（上午/下午/晚上） */
  period: string;
  /** 节次（12节/34节/56节/78节/910节） */
  slot: string;
  /** 该槽位的课程列表 */
  courses: TeacherCourseItem[];
}

/**
 * 教师课表结果
 */
export interface TeacherCourseResult {
  /** 教师姓名 */
  teacherName: string;
  /** 学期 */
  semester: string;
  /** 所有课程槽位 */
  slots: TeacherCourseSlot[];
}

export interface TeacherCourseInfoResult {
  result: TeacherCourseResult | null;
  success: boolean;
}

/**
 * 教师课表提取器
 *
 * 解析教师课表页面的标准课表表格：
 * - 标题行含教师姓名和学期
 * - 上午(12/34节)、下午(56/78节)、晚上(910节) 共5行
 * - 每行7列对应星期一~星期日
 * - 格内多门课以 -------------------- 分隔
 */
export const extractTeacherCourseInfo = (html: string): TeacherCourseInfoResult => {
  if (!html || typeof html !== 'string' || html.includes('登录超时')) {
    return { result: null, success: false };
  }

  const { teacherName, semester } = parseTeacherTitle(html);
  const slots = parseCourseTable(html, parseTeacherCellCourses);

  return {
    result: { teacherName, semester, slots },
    success: slots.length > 0,
  };
};

/**
 * 提取标题中的教师姓名和学期
 * 格式："（蒲海波）2025-2026-2学期课程安排表"
 */
function parseTeacherTitle(html: string): { teacherName: string; semester: string } {
  const titleMatch = html.match(/[（(]([^）)]+)[）)]\s*(\d{4}-\d{4}-\d)\s*(?:学期)?\s*课程/);
  if (titleMatch) {
    return { teacherName: titleMatch[1].trim(), semester: titleMatch[2] };
  }

  // 备选：匹配四川农业大学格式
  const semMatch = html.match(/四川农业大学\s*(\d{4}-\d{4}-\d)/);
  return { teacherName: '', semester: semMatch ? semMatch[1] : '' };
}

/**
 * 定位课表表格并解析所有课程槽位
 * （与 classroomCourseInfoExtractor 中的 parseCourseTable 逻辑相同，
 *   仅 cellParser 不同）
 */
function parseCourseTable(
  html: string,
  cellParser: (cellHtml: string) => TeacherCourseItem[],
): TeacherCourseSlot[] {
  const tableMatch = html.match(
    /课程[^<]*<[^>]*>[\s\S]*?<table[^>]*border\s*=\s*"?1[^>]*>([\s\S]*?)<\/table>/i
  );
  if (!tableMatch) return [];

  const tableHtml = tableMatch[1];
  const trMatches = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
  const slots: TeacherCourseSlot[] = [];
  let currentPeriod = '';

  for (let i = 1; i < trMatches.length; i++) {
    const trHtml = trMatches[i];
    const tds = trHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];

    // 检查 rowspan 时段标签
    const firstTdContent = tds[0] || '';
    const periodMatch = firstTdContent.match(/rowspan[^>]*>([\s\S]*?)</i);
    if (periodMatch) {
      currentPeriod = stripTags(periodMatch[1]).trim();
    }

    const slotTdIdx = periodMatch ? 1 : 0;
    const slotText = stripTags(tds[slotTdIdx] || '').replace(/\s+/g, '').trim();
    if (!slotText.includes('节')) continue;

    const courseStart = slotTdIdx + 1;
    for (let d = 0; d < 7; d++) {
      const cellIdx = courseStart + d;
      if (cellIdx >= tds.length) break;

      const cellCourses = cellParser(tds[cellIdx]);
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
 * 解析教师课表单元格中的课程列表
 *
 * 格内多门课以 -------------------- 分隔，每门课的结构（stripTags 后）：
 *
 * 格式 A（含班号+性质+实验）：
 *   课程名_性质班号
 *   (实验)
 *   校区：教室
 *   N-M
 *   周(连堂4学时)
 *
 * 格式 B（含班号、无实验）：
 *   课程名_性质班号
 *   校区：教室
 *   N-M
 *   周(单周)(2学时)
 *
 * 格式 C（简洁，无下划线后缀）：
 *   课程名
 *   校区：教室
 *   N-M
 *   周(2学时)
 */
function parseTeacherCellCourses(cellHtml: string): TeacherCourseItem[] {
  const text = stripTags(cellHtml).trim();
  if (!text || text === '&nbsp;') return [];

  // 按 -------------------- 拆分为多门课
  const chunks = text.split(/[-－—]{4,}/);
  const courses: TeacherCourseItem[] = [];

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    const lines = trimmed
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    if (lines.length === 0) continue;

    // 第一行：课程名（可能含 _性质_班号 后缀）
    const firstLine = lines[0];

    // 解析课程名中的性质和班号
    // 格式：课程名_性质_班号  或  课程名_性质班号_分组号
    let courseName = firstLine;
    let courseType = '';
    let classId = '';

    // 尝试按 _ 分割，识别性质关键词
    const underscoreParts = firstLine.split('_');
    if (underscoreParts.length >= 2) {
      const typeKeywords = ['必修', '选修', '限选', '任选', '公选', '专业方向课', '专业基础课', '通识实践', '实践教学'];

      for (let k = 1; k < underscoreParts.length; k++) {
        const part = underscoreParts[k];
        // 精确匹配或匹配 "关键词后紧跟数字" 的情况（如 "必修4192023"）
        const exactMatch = typeKeywords.find((t) => part === t);
        if (exactMatch) {
          courseType = exactMatch;
          classId = underscoreParts.slice(k + 1).join('_');
          courseName = underscoreParts.slice(0, k).join('_');
          break;
        }
        // 匹配 "关键词+数字" 模式（如 "必修4192023" → type=必修, rest=4192023）
        const prefixMatch = typeKeywords.find((t) => part.startsWith(t) && part !== t);
        if (prefixMatch) {
          courseType = prefixMatch;
          const rest = part.slice(prefixMatch.length);
          classId = [rest, ...underscoreParts.slice(k + 1)].filter(Boolean).join('_');
          courseName = underscoreParts.slice(0, k).join('_');
          break;
        }
      }
    }

    // 剩余行的解析
    let isExperiment = false;
    let location = '';
    let weekRange = '';
    let weekPattern = '';
    let isContinuous = false;
    let hoursUnit = '';

    for (let j = 1; j < lines.length; j++) {
      const line = lines[j];

      if (line === '(实验)' || line.includes('实验')) {
        isExperiment = true;
      } else if (line.includes('校区') || line.includes('：') && !/^\d/.test(line)) {
        location = line;
      } else if (/^\d+[-~]\d+$/.test(line)) {
        weekRange = line;
      } else if (line.startsWith('周') || line.includes('周')) {
        // 周行的各种修饰符
        if (line.includes('单周')) weekPattern = '单';
        else if (line.includes('双周')) weekPattern = '双';
        if (line.includes('连堂')) isContinuous = true;
        // 提取学时
        const hoursMatch = line.match(/(\d+学时)/);
        if (hoursMatch) hoursUnit = hoursMatch[1];
      }
    }

    courses.push({
      courseName,
      courseType,
      classId,
      location,
      weekRange,
      weekPattern,
      isExperiment,
      isContinuous,
      hoursUnit,
    });
  }

  return courses;
}

/**
 * 教师搜索结果中的一条记录
 */
export interface TeacherSearchItem {
  index: string;
  campus: string;
  department: string;
  name: string;
  bianhao: string;
}

export interface TeacherSearchResult {
  result: TeacherSearchItem[] | null;
  success: boolean;
}

/**
 * 从教师搜索列表页 (jiaoshi_new.asp) 提取搜索结果
 *
 * 解析 id="grid" 表格：序号 | 校区 | 部门 | 姓名 | 查看(含 bianhao)
 */
export const extractTeacherSearchResults = (html: string): TeacherSearchResult => {
  if (!html || typeof html !== 'string') {
    return { result: null, success: false };
  }

  const rows = parseSearchGrid(html);
  return { result: rows, success: rows.length > 0 };
};

function parseSearchGrid(html: string): TeacherSearchItem[] {
  const tableMatch = html.match(
    /<table[^>]*id\s*=\s*"?grid[^>]*>([\s\S]*?)<\/table>/i
  );
  if (!tableMatch) return [];

  const tableHtml = tableMatch[1];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const result: TeacherSearchItem[] = [];
  let isHeader = true;

  while (true) {
    const rowMatch = rowRegex.exec(tableHtml);
    if (!rowMatch) break;
    if (isHeader) { isHeader = false; continue; }

    const rowHtml = rowMatch[1];
    const cells = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
    const values = cells.map((cell) => stripTags(cell));
    if (values.length < 5) continue;

    const linkCell = cells[cells.length - 1] || '';
    const bianhaoMatch = linkCell.match(/bianhao=([^&\s"']+)/i);
    const bianhao = bianhaoMatch ? bianhaoMatch[1] : '';

    const item: TeacherSearchItem = {
      index: values[0]?.trim() || '',
      campus: values[1]?.trim() || '',
      department: values[2]?.trim() || '',
      name: values[3]?.trim() || '',
      bianhao,
    };

    if (item.index && /^\d+$/.test(item.index) && item.name) {
      result.push(item);
    }
  }

  return result;
}
