/**
 * 排名信息提取模块
 * 负责从排名查询页面提取学生的学年/学期排名数据
 */

import { extractSegments, parseTable } from '../utils/html';

/**
 * 排名信息项定义
 */
export interface RankItem {
  index?: string;         // 序号
  campus?: string;        // 校区
  college?: string;       // 学院/系别
  major?: string;         // 专业
  grade?: string;         // 年级
  studentId?: string;     // 学号
  name?: string;          // 姓名
  className?: string;     // 班级
  weightedScore?: string; // 加权平均成绩
  majorRank?: string;     // 专业排名（如：1/120）
  status?: string;        // 在读状态
}

/**
 * 排名提取结果接口
 */
export interface RankResult {
  result: RankItem | null;             // 当前用户的排名数据
  success: boolean;                    // 提取状态
}

/**
 * 排名信息提取器
 * 
 * 核心逻辑：
 * 1. 定位包含“排名”、“加权”等关键字的表格
 * 2. 识别表头各列的位置
 * 3. 提取用户所在行的各项数据
 *
 * @param html 原始 HTML 字符串内容
 * @returns 清洗后的排名结果对象
 * 
 * @example
 * const result = extractRankInfo(html);
 * if (result.success) {
 *   console.log(`您的专业排名为: ${result.result?.majorRank}`);
 * }
 */
export const extractRankInfo = (html: string): RankResult => {
  // 基础校验
  if (!html || typeof html !== 'string') {
    return { result: null, success: false };
  }

  // 1. 定位排名数据表格
  const tableHit = findRankTable(html);
  if (!tableHit || tableHit.grid.length < 2) {
    return { result: null, success: false };
  }

  const { grid } = tableHit;
  // 寻找表头行
  const header = grid.find((row) => row.some((cell) => cell)) || [];
  // 识别各字段索引
  const cols = detectColumns(header);

  // 定义字段与索引的映射关系
  const mappings: Record<keyof RankItem, number> = {
    index: cols.index,
    campus: cols.campus,
    college: cols.college,
    major: cols.major,
    grade: cols.grade,
    studentId: cols.studentId,
    name: cols.name,
    className: cols.className,
    weightedScore: cols.weightedScore,
    majorRank: cols.majorRank,
    status: cols.status,
  };

  // 2. 查找有效数据行
  const headerIndex = grid.indexOf(header);
  for (let i = headerIndex + 1; i < grid.length; i++) {
    const row = grid[i];
    const item: RankItem = {};

    let hasData = false;
    (Object.entries(mappings) as [keyof RankItem, number][]).forEach(([key, colIdx]) => {
      const val = pickCell(row, colIdx);
      if (val) {
        item[key] = val;
        if (['studentId', 'name', 'weightedScore', 'majorRank'].includes(key)) {
          hasData = true;
        }
      }
    });

    if (hasData) {
      return { result: item, success: true };
    }
  }

  return { result: null, success: false };
};

/**
 * 在 HTML 中寻找排名表格
 * 通过关键字得分定位
 */
function findRankTable(html: string): { grid: string[][] } | null {
  const tables = extractSegments(html, 'table');
  const headerKeywords = ['排名', '加权', '学号', '姓名', '专业', '年级'];
  
  let bestGrid: string[][] | null = null;
  let maxScore = -1;

  for (const tableHtml of tables) {
    const grid = parseTable(tableHtml);
    const header = grid.find((r) => r.some((c) => c)) || [];
    
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
    index: findIdx(['序', '序号']),
    campus: findIdx(['校区']),
    college: findIdx(['系别', '学院']),
    major: findIdx(['专业']),
    grade: findIdx(['年级']),
    studentId: findIdx(['学号']),
    name: findIdx(['姓名']),
    className: findIdx(['班级']),
    weightedScore: findIdx(['有效必修加权成绩', '加权成绩', '加权平均成绩']),
    majorRank: findIdx(['专业排名', '排名']),
    status: findIdx(['在读情况', '在读']),
  };
}

/**
 * 安全提取单元格内容
 */
function pickCell(row: string[], index: number): string {
  if (index < 0 || index >= row.length) return '';
  return (row[index] || '').trim();
}
