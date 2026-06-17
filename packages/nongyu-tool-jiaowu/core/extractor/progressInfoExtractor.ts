/**
 * 学业进度提取模块
 * 负责从学业进度页面提取学生的修读学分统计情况
 */

import { extractSegments, parseTable } from '../utils/html';

/**
 * 学业进度项定义
 */
export interface ProgressItem {
  type: string;      // 课程性质 (如: 必修课, 选修课)
  required: string;  // 应修学分
  earned: string;    // 已修学分
  diff: string;      // 学分差
  transfer: string;  // 可结转学分
  progress: string;  // 分段完成进度（百分比字符串）
}

/**
 * 学业进度提取结果接口
 */
export interface ProgressResult {
  result: ProgressItem[]; // 进度明细列表
  success: boolean;       // 提取状态
}

/**
 * 学业进度提取器
 * 
 * 核心逻辑：
 * 1. 识别包含学分统计关键字的表格
 * 2. 提取表格中的每一行数据（对应一个课程性质）
 * 3. 提取顶部的专业班级标题信息
 *
 * @param html 原始 HTML 字符串内容
 * @returns 清洗后的学业进度结果对象
 * 
 * @example
 * const result = extractProgressInfo(html);
 * if (result.success) {
 *   console.log(`已修总学分: ${result.result.find(i => i.type === '合计')?.earned}`);
 * }
 */
export const extractProgressInfo = (html: string): ProgressResult => {
  // 基础校验
  if (!html || typeof html !== 'string') {
    return { result: [], success: false };
  }

  // 1. 定位学业进度表格
  const tableHit = findProgressTable(html);
  if (!tableHit) {
    return { result: [], success: false };
  }

  // 2. 转换表格数据为对象列表
  const items = tableHit.grid
    .filter((row) => row.length >= 5) // 确保列数基本完整（含rowspan分类标签的行有7列，不含的6列，合计行中colspan=2后也有6列）
    .filter((row) => !row.some((cell) => cell.includes('课程性质') || cell.includes('应修'))) // 过滤表头行
    .map((row) => {
      // 如果有7列，说明第一个单元格是rowspan的分类标签（如"必修类"、"选修类"），需要偏移1列
      const offset = row.length > 6 ? 1 : 0;
      return {
        type: row[offset],
        required: row[offset + 1],
        earned: row[offset + 2],
        diff: row[offset + 3],
        transfer: row[offset + 4],
        progress: row[offset + 5],
      };
    })
    .filter((item) => item.type && (item.required || item.earned)); // 过滤掉空行

  return { 
    result: items, 
    success: true,
  };
};

/**
 * 在页面中定位学业进度表格
 * 采用多行匹配得分机制，提高定位准确度
 */
function findProgressTable(html: string): { grid: string[][] } | null {
  const tables = extractSegments(html, 'table');
  const headerKeywords = ['课程性质', '应修学分', '已修学分', '学分差', '可结转学分', '分段完成进度'];
  
  let bestGrid: string[][] | null = null;
  let maxScore = -1;

  for (const tableHtml of tables) {
    // 解析表格并过滤掉全空行
    const grid = parseTable(tableHtml).filter((row) => row.some((cell) => cell));
    if (grid.length === 0) continue;

    // 评分机制：检查表格前 3 行中包含关键字的总数
    const score = grid.slice(0, 3).reduce((acc, row) => {
      const hits = row.reduce((sum, cell) => 
        sum + (headerKeywords.some((k) => cell.includes(k)) ? 1 : 0), 0);
      return acc + hits;
    }, 0);

    if (score > maxScore && score > 0) {
      maxScore = score;
      bestGrid = grid;
    }
  }

  return bestGrid ? { grid: bestGrid } : null;
}
