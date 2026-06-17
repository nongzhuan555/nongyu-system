/**
 * 成绩信息提取模块
 * 负责从成绩查询页面提取学生的课程成绩记录
 */

import { extractSegments, parseTable } from '../utils/html';

/**
 * 成绩信息项定义
 */
export interface ScoreItem {
  courseName?: string;   // 课程名称
  score?: string;        // 成绩（可能是数字字符串，也可能是"优秀"、"合格"等）
  credit?: string;       // 学分
  gradePoint?: string;   // 绩点
  term?: string;         // 学年学期（如：2023-2024-1）
  courseType?: string;   // 课程性质（如：必修、选修）
  source?: string;       // 成绩来源（如：初修、补考）
  note?: string;         // 成绩说明
}

/**
 * 成绩提取结果接口
 */
export interface ScoreResult {
  result: ScoreItem[];                  // 成绩列表
  success: boolean;                     // 提取状态
}

/**
 * 成绩信息提取器
 * 
 * 核心逻辑：
 * 1. 扫描页面中的所有表格
 * 2. 通过关键字匹配定位“成绩统计表”
 * 3. 自动识别表格列索引（处理不同学期表格格式微差）
 * 4. 遍历数据行并清洗内容
 *
 * @param html 原始 HTML 字符串内容
 * @returns 清洗后的成绩提取结果对象
 * 
 * @example
 * const result = extractScoreInfo(html);
 * if (result.success) {
 *   console.log(`抓取到 ${result.result.length} 门课程成绩`);
 * }
 */
export const extractScoreInfo = (html: string): ScoreResult => {
  // 基础内容校验
  if (!html || typeof html !== 'string') {
    return { result: [], success: false };
  }

  // 1. 定位目标成绩表格
  const tableHit = findScoreTable(html);
  if (!tableHit || tableHit.grid.length < 2) {
    return { result: [], success: false };
  }

  const { grid } = tableHit;
  // 寻找包含有效文字的表头行
  const header = grid.find((row) => row.some((cell) => cell)) || [];
  // 识别列索引
  const cols = detectColumns(header);
  
  const items: ScoreItem[] = [];
  const headerIndex = grid.indexOf(header);

  // 2. 从表头下一行开始遍历数据
  for (let i = headerIndex + 1; i < grid.length; i++) {
    const row = grid[i];
    const item: ScoreItem = {
      courseName: pickCell(row, cols.courseName),
      score: pickCell(row, cols.score),
      credit: pickCell(row, cols.credit),
      gradePoint: pickCell(row, cols.gradePoint),
      term: pickCell(row, cols.term),
      courseType: pickCell(row, cols.courseType),
      source: pickCell(row, cols.source),
      note: pickCell(row, cols.note),
    };

    // 有效行校验：必须包含课程名和成绩
    if (item.courseName && item.score) {
      items.push(item);
    }
  }

  return {
    result: items,
    success: true,
  };
};

/**
 * 在 HTML 中寻找最像成绩表的表格
 * 评分标准：包含预设关键字（课程、成绩等）最多的表格
 */
function findScoreTable(html: string): { grid: string[][] } | null {
  const tables = extractSegments(html, 'table');
  const headerKeywords = ['课程', '成绩', '学分', '绩点', '学期', '课程性质', '成绩来源', '成绩说明'];
  
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
 * 识别表头对应的列索引
 * 处理教务系统可能存在的列顺序变动或不同命名
 */
function detectColumns(header: string[]): Record<string, number> {
  // 规范化表头文字：移除空白符、冒号，并转为小写
  const normalized = header.map((h) => h.replace(/\s+/g, '').replace(/：|:/g, '').toLowerCase());
  const findIdx = (keywords: string[]) => normalized.findIndex((h) => keywords.some((k) => h.includes(k)));

  return {
    courseName: findIdx(['课程名称', '课程名', '课程']),
    score: findIdx(['成绩', '总评成绩', '最终成绩']),
    credit: findIdx(['学分']),
    gradePoint: findIdx(['绩点']),
    term: findIdx(['学年学期', '学期', '学年']),
    courseType: findIdx(['课程性质', '性质']),
    source: findIdx(['成绩来源', '来源']),
    note: findIdx(['成绩说明', '说明']),
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
