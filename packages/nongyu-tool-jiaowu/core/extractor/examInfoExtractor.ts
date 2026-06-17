/**
 * 考试信息提取模块
 * 负责从考试安排页面提取学生的考试时间、地点、座位号等信息
 */

import { extractSegments, parseTable } from '../utils/html';

/**
 * 考试信息项定义
 */
export interface ExamItem {
  courseName?: string;       // 课程名称
  examTime?: string;         // 考试时间
  examRoom?: string;         // 考试地点/教室
  seatNumber?: string;       // 座位号
  assessmentMethod?: string; // 考核方式（如：闭卷）
}

/**
 * 考试提取结果接口
 */
export interface ExamResult {
  result: ExamItem[];                  // 考试安排列表
  success: boolean;                    // 提取状态
}

/**
 * 考试信息提取器
 * 
 * 核心逻辑：
 * 1. 扫描页面中包含考试关键字的表格
 * 2. 识别表头列索引
 * 3. 提取每一行的考试具体信息
 *
 * @param html 原始 HTML 字符串内容
 * @returns 清洗后的考试结果对象
 * 
 * @example
 * const result = extractExamInfo(html);
 * if (result.success) {
 *   console.log(`最近一场考试是: ${result.result[0].courseName}`);
 * }
 */
export const extractExamInfo = (html: string): ExamResult => {
  // 基础校验
  if (!html || typeof html !== 'string') {
    return { result: [], success: false };
  }

  // 1. 定位考试安排表格
  const tableHit = findExamTable(html);
  if (!tableHit || tableHit.grid.length < 2) {
    return { result: [], success: false };
  }

  const { grid } = tableHit;
  // 寻找包含有效文字的表头行
  const header = grid.find((row) => row.some((cell) => cell)) || [];
  // 识别列索引
  const cols = detectColumns(header);
  
  const items: ExamItem[] = [];
  const headerIndex = grid.indexOf(header);

  // 2. 遍历数据行
  for (let i = headerIndex + 1; i < grid.length; i++) {
    const row = grid[i];
    const item: ExamItem = {
      courseName: pickCell(row, cols.courseName),
      examTime: pickCell(row, cols.examTime),
      examRoom: pickCell(row, cols.examRoom),
      seatNumber: pickCell(row, cols.seatNumber),
      assessmentMethod: pickCell(row, cols.assessmentMethod),
    };

    // 有效行校验：只要有课程名或考试时间，就认为是有效行
    if (item.courseName || item.examTime) {
      items.push(item);
    }
  }

  return {
    result: items,
    success: true,
  };
};

/**
 * 在 HTML 中寻找考试安排表格
 * 通过关键字匹配得分最高的表格被认为是目标表格
 */
function findExamTable(html: string): { grid: string[][] } | null {
  const tables = extractSegments(html, 'table');
  const headerKeywords = ['课程', '时间', '地点', '座号', '考试'];
  
  let bestGrid: string[][] | null = null;
  let maxScore = -1;

  for (const tableHtml of tables) {
    const grid = parseTable(tableHtml);
    const header = grid.find((r) => r.some((c) => c)) || [];
    
    // 计算当前表格的关键字匹配得分
    const score = header.reduce((acc, cell) => {
      return acc + (headerKeywords.some((k) => cell.includes(k)) ? 1 : 0);
    }, 0);

    if (score > maxScore && score > 0) {
      maxScore = score;
      bestGrid = grid;
    }
  }

  return bestGrid ? { grid: bestGrid } : null;
}

/**
 * 识别表头列索引
 */
function detectColumns(header: string[]): Record<string, number> {
  const normalized = header.map((h) => h.replace(/\s+/g, '').replace(/：|:/g, '').toLowerCase());
  const findIdx = (keywords: string[]) => normalized.findIndex((h) => keywords.some((k) => h.includes(k)));

  return {
    courseName: findIdx(['课程名称', '课程名', '课程']),
    examTime: findIdx(['考试时间', '时间']),
    examRoom: findIdx(['考试地点', '地点', '教室']),
    seatNumber: findIdx(['座位号', '座号']),
    assessmentMethod: findIdx(['考核方式', '考试方式']),
  };
}

/**
 * 安全提取单元格内容
 */
function pickCell(row: string[], index: number): string {
  if (index < 0 || index >= row.length) return '';
  return (row[index] || '').trim();
}
