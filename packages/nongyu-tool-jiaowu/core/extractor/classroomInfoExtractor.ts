/**
 * 教室信息提取模块
 * 负责从教务教室课表页面 (jshi_new.asp) 提取教室基本信息
 */

import { stripTags } from '../utils/html';

/**
 * 教室信息字段定义
 */
export interface ClassroomInfo {
  /** 序号 */
  index: string;
  /** 校区 */
  campus: string;
  /** 教室地点 */
  location: string;
  /** 可容纳人数 */
  capacity: string;
  /** 教室类别 */
  type: string;
  /** 教室编号（查看链接中的 bianhao 参数） */
  classroomId: string;
}

/**
 * 教室信息提取结果接口
 */
export interface ClassroomInfoResult {
  result: ClassroomInfo[] | null;
  success: boolean;
}

/**
 * 教务网教室信息提取器
 *
 * 解析 jshi_new.asp 页面中 id="grid" 的表格：
 * - 表头行 (bgcolor=#D5D5D5) 定义列
 * - 数据行每行包含 6 个 td：序号 | 校区 | 教室地点 | 可容纳人数 | 教室类别 | 查看
 *
 * @param html 原始 HTML 字符串
 * @returns 教室列表
 *
 * @example
 * const { result, success } = extractClassroomInfo(html);
 * if (success) {
 *   console.log(result.length, result[0].location);
 * }
 */
export const extractClassroomInfo = (html: string): ClassroomInfoResult => {
  if (!html || typeof html !== 'string' || html.includes('登录超时')) {
    return { result: null, success: false };
  }

  const rows = parseGridTable(html);
  return { result: rows, success: rows.length > 0 };
};

/**
 * 解析 id="grid" 表格的数据行
 */
function parseGridTable(html: string): ClassroomInfo[] {
  // 定位 id="grid" 的表格
  const tableMatch = html.match(/<table[^>]*id\s*=\s*"?grid[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return [];

  const tableHtml = tableMatch[1];

  // 匹配所有 TR 行
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const result: ClassroomInfo[] = [];
  let rowMatch: RegExpExecArray | null;
  let isHeader = true; // 第一行为表头，跳过

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    if (isHeader) {
      isHeader = false;
      continue;
    }

    const rowHtml = rowMatch[1];
    const cells = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
    const values = cells.map((cell) => stripTags(cell));

    if (values.length < 5) continue;

    const index = values[0]?.trim() || '';

    // 提取教室编号（从"查看"链接的 bianhao 参数）
    const linkMatch = cells[cells.length - 1]?.match(/bianhao=([^&\s"']+)/i);
    const classroomId = linkMatch ? linkMatch[1] : '';

    const item: ClassroomInfo = {
      index,
      campus: values[1]?.trim() || '',
      location: values[2]?.trim() || '',
      capacity: values[3]?.trim() || '',
      type: values[4]?.trim() || '',
      classroomId,
    };

    // 跳过序号为空的行（可能是表头等非数据行）
    if (index && /^\d+$/.test(index)) {
      result.push(item);
    }
  }

  return result;
}
