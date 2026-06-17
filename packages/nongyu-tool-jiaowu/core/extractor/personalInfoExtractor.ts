/**
 * 个人信息提取模块
 * 负责从教务学生档案页面 (bjiben.asp) 提取基本信息
 */

import { stripTags } from '../utils/html';

/**
 * 教务个人信息字段定义
 */
export interface PersonalInfo {
  name?: string;           // 姓名
  studentId?: string;      // 学号
  gender?: string;         // 性别
  college?: string;        // 学院/系别
  major?: string;          // 专业
  grade?: string;          // 年级
  className?: string;      // 班级
  identity?: string;       // 培养层次（如：本科）
  studentStatus?: string;  // 学籍状态（如：在读）
  enrollmentDate?: string; // 入学日期
  ethnicity?: string;      // 民族
  politicalStatus?: string;// 政治面貌
  phone?: string;          // 个人电话
  examId?: string;         // 考生号
  homeAddress?: string;    // 家庭通讯地址
  campus?: string;         // 校区
}

/**
 * 个人信息提取结果接口
 */
export interface PersonalInfoResult {
  result: PersonalInfo | null;
  success: boolean;
}

/**
 * 教务网个人信息提取器
 * 
 * 解析 bjiben.asp 页面的 tablebody 表格结构：
 * - 表头行 (class=g_column) 包含字段名
 * - 数据行 (class=g_body_2) 包含对应值
 *
 * @param html 原始 HTML 字符串内容
 * @returns 包含提取结果和成功状态的对象
 * 
 * @example
 * const { result, success } = extractPersonalInfo(html);
 * if (success) {
 *   console.log(result.name, result.studentId);
 * }
 */
export const extractPersonalInfo = (html: string): PersonalInfoResult => {
  if (!html || typeof html !== 'string' || html.includes('登录超时')) {
    return { result: null, success: false };
  }

  const rawData = parseTablebody(html);
  if (!rawData || Object.keys(rawData).length === 0) {
    // 兼容旧版欢迎页格式
    const legacyData = parseLegacyFormats(html);
    if (legacyData && Object.keys(legacyData).length > 0) {
      return { result: mapToStandardFields(legacyData), success: true };
    }
    return { result: null, success: false };
  }

  const cleanedData = cleanRawValues(rawData);
  const result = mapToStandardFields(cleanedData);

  return { result, success: true };
};

/**
 * 解析 tablebody 表格
 * 表头行提供字段名，数据行提供字段值
 */
function parseTablebody(html: string): Record<string, string> {
  // 定位 class=tablebody 的表格
  const tableMatch = html.match(/<table[^>]*class\s*=\s*"?tablebody[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return {};

  const tableHtml = tableMatch[1];

  // 提取表头行 (class=g_column)
  const headerMatch = tableHtml.match(/<tr[^>]*class\s*=\s*"?g_column[^>]*>([\s\S]*?)<\/tr>/i);
  if (!headerMatch) return {};

  // 从表头行提取列名
  const headerCells = headerMatch[1].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
  const headers = headerCells.map((cell) => stripTags(cell));

  // 提取数据行 (class=g_body_2)
  const bodyMatch = tableHtml.match(/<tr[^>]*class\s*=\s*"?g_body_2[^>]*>([\s\S]*?)<\/tr>/i);
  if (!bodyMatch) return {};

  // 从数据行提取值
  const bodyCells = bodyMatch[1].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
  const values = bodyCells.map((cell) => stripTags(cell));

  // 按索引对齐构建键值对
  const result: Record<string, string> = {};
  const len = Math.min(headers.length, values.length);
  for (let i = 0; i < len; i++) {
    const key = headers[i].trim();
    const value = values[i].trim();
    if (key && value) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * 兼容旧版欢迎页格式的解析（回退策略）
 */
function parseLegacyFormats(html: string): Record<string, string> {
  return {
    ...parseTablePairs(html),
    ...parseInlinePairs(html),
    ...parseWelcomeLine(html),
  };
}

/**
 * 解析表格中的键值对结构 (td/th 模式)
 * 寻找连续的两个单元格，前者作为键，后者作为值
 */
function parseTablePairs(html: string): Record<string, string> {
  const result: Record<string, string> = {};
  const rowMatches = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];

  rowMatches.forEach((row) => {
    const cellMatches = row.match(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi) || [];
    const cells = cellMatches.map((cell) => stripTags(cell));

    for (let i = 0; i + 1 < cells.length; i += 2) {
      const key = cells[i].replace(/[:：]\s*$/, '').trim();
      const value = cells[i + 1].trim();
      if (key && value && !result[key]) {
        result[key] = value;
      }
    }
  });

  return result;
}

/**
 * 解析行内的 "键:值" 结构
 */
function parseInlinePairs(html: string): Record<string, string> {
  const result: Record<string, string> = {};
  const text = stripTags(html);
  const pairRegex = /([^\s:：\n\r]{2,12})\s*[:：]\s*([^\n\r]+)/g;

  let match;
  while ((match = pairRegex.exec(text)) !== null) {
    const key = match[1].trim();
    const value = match[2].trim();
    if (key && value && !result[key]) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * 专门解析欢迎行文本（旧版欢迎页兼容）
 */
function parseWelcomeLine(html: string): Record<string, string> {
  const result: Record<string, string> = {};
  const text = stripTags(html);
  const welcomeMatch = text.match(/欢迎您[：:][\s\S]*?(?:\n|$)/);

  if (welcomeMatch) {
    const line = welcomeMatch[0];

    const nameMatch = line.match(/欢迎您[：:]\s*([^，,\s]+)\s*[，,]/);
    if (nameMatch) result['姓名'] = nameMatch[1];

    const patterns = [
      { key: '学号', regex: /学号[：:]\s*([0-9A-Za-z_-]+)/ },
      { key: '身份', regex: /身份[：:]\s*([^\s/，,]+)/ },
      { key: '校区', regex: /校区[：:]\s*([^\s/，,]+)/ },
      { key: '学院', regex: /学院[：:]\s*([^\s/，,]+)/ },
      { key: '年级', regex: /年级[：:]\s*([0-9]{4})/ },
      { key: '专业', regex: /专业[：:]\s*([^\s/（(，,]+)/ },
    ];

    patterns.forEach(({ key, regex }) => {
      const match = line.match(regex);
      if (match && match[1]) {
        result[key] = match[1];
      }
    });
  }

  return result;
}

/**
 * 清洗原始值
 * 移除括注内容，仅保留核心文本
 */
function cleanRawValues(data: Record<string, string>): Record<string, string> {
  const cleaned: Record<string, string> = {};

  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'string') {
      cleaned[key] = value
        .replace(/（[^）]*）/g, '')
        .replace(/\([^)]*\)/g, '')
        .trim();
    }
  });

  return cleaned;
}

/**
 * 将原始中文键名映射到标准 PersonalInfo 对象
 */
function mapToStandardFields(data: Record<string, string>): PersonalInfo {
  const find = (keywords: string[]) => {
    const entry = Object.entries(data).find(([k]) => keywords.some((kw) => k.includes(kw)));
    return entry ? entry[1] : undefined;
  };

  return {
    name: find(['姓名', '学生姓名']),
    studentId: find(['学号', '学生学号']),
    gender: find(['性别']),
    college: find(['系别', '学院', '院系']),
    major: find(['专业', '主修专业']),
    grade: find(['年级', '入学年份']),
    className: find(['班级', '新班级']),
    identity: find(['培养层次', '身份', '学生类型', '类别']),
    studentStatus: find(['学籍状态']),
    enrollmentDate: find(['入学日期']),
    ethnicity: find(['民族']),
    politicalStatus: find(['政治面貌']),
    phone: find(['个人电话']),
    examId: find(['考生号']),
    homeAddress: find(['家庭通讯地址']),
    campus: find(['校区']),
  };
}
