/**
 * 教师信息提取模块
 * 负责从教务教师简历页面 (jiaoshishow.asp) 提取教师基本信息
 */

import { stripTags } from '../utils/html';

/**
 * 教师个人信息字段定义
 */
export interface TeacherInfo {
  name?: string;            // 教师姓名
  gender?: string;          // 性别
  campus?: string;          // 所在校区
  department?: string;      // 所在部门
  joinDate?: string;        // 来校时间
  ethnicity?: string;       // 民族
  education?: string;       // 学历
  degree?: string;          // 学位
  title?: string;           // 职称
  partyPosition?: string;   // 党政职务
  teachingUnit?: string;    // 任课单位
  section?: string;         // 所属系室
  graduateSchool?: string;  // 毕业学校
  graduateMajor?: string;   // 毕业专业
  officePhone?: string;     // 办公电话
  mobilePhone?: string;     // 移动电话
  officeAddress?: string;   // 办公地址
  qq?: string;              // QQ号码
  email?: string;           // 电子邮件
  mainCourses?: string;     // 主要承担课程
  researchDirection?: string; // 研究方向
  achievements?: string;    // 主要成果及获奖情况
  teacherMessage?: string;  // 教师寄语
  updateDate?: string;      // 最近更新日期
}

/**
 * 教师信息提取结果接口
 */
export interface TeacherInfoResult {
  result: TeacherInfo | null;
  success: boolean;
}

/**
 * 教务网教师信息提取器
 *
 * 解析 jiaoshishow.asp 页面的表格：
 * - 标签行使用 class=style7（加粗标签）
 * - 值行使用 class=style6（普通文本）
 * - 按 HTML 结构顺序提取键值对
 *
 * @param html 原始 HTML 字符串
 * @returns 教师信息对象
 *
 * @example
 * const { result, success } = extractTeacherInfo(html);
 * if (success) {
 *   console.log(result.name, result.department);
 * }
 */
export const extractTeacherInfo = (html: string): TeacherInfoResult => {
  if (!html || typeof html !== 'string' || html.includes('登录超时')) {
    return { result: null, success: false };
  }

  const rawData = parseStyleKeyValue(html);
  const result = mapToTeacherFields(rawData);

  return { result, success: Object.keys(result).length > 0 };
};

/**
 * 按 HTML 结构顺序提取 style7 / style6 键值对
 *
 * 页面结构：
 * - style7 类 td 为标签名
 * - style6 类 td 为标签值
 * - 标签和值交替出现（可能有 colspan 或 rowspan 打断简单交替）
 *
 * 策略：分别提取所有 style7 和 style6 单元格文本，按出现顺序对位
 */
function parseStyleKeyValue(html: string): Record<string, string> {
  const result: Record<string, string> = {};

  // 定位包含"教师个人基本信息"的表格
  const tableMatch = html.match(
    /<table[^>]*>[\s\S]*?教师个人基本信息[\s\S]*?<\/table>/i
  );
  const targetHtml = tableMatch ? tableMatch[0] : html;

  // 提取所有 style7（标签）和 style6（值）的单元格
  const labelMatches = extractTagContents(targetHtml, 'style7');
  const valueMatches = extractTagContents(targetHtml, 'style6');

  // 跳过空标签和更新日期单元格
  const labels: string[] = [];
  for (const t of labelMatches) {
    const text = t.trim();
    if (text && text !== '教师个人基本信息') {
      labels.push(text);
    }
  }

  // 过滤 style6 中的非数据单元格（如居中更新时间）
  const values: string[] = [];
  for (const v of valueMatches) {
    const text = v.trim();
    // 跳过纯日期的居中对齐单元格（最近更新日期）
    if (text.startsWith('(最近更新日期')) {
      // 提取更新日期作为单独字段
      const dateMatch = text.match(/最近更新日期[：:]\s*([^)]+)/);
      if (dateMatch) {
        values.push(dateMatch[1].trim());
      }
      continue;
    }
    values.push(text);
  }

  // 按出现顺序对齐（label 和 value 数量应对应，如有偏差取较小值）
  const len = Math.min(labels.length, values.length);
  for (let i = 0; i < len; i++) {
    const key = labels[i];
    const value = values[i];
    if (key && value !== undefined) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * 提取类名匹配的 td 标签中的纯文本内容
 */
function extractTagContents(html: string, className: string): string[] {
  const regex = new RegExp(
    `<td[^>]*class\\s*=\\s*"?${className}[^>]*>([\\s\\S]*?)</td>`,
    'gi'
  );
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    results.push(stripTags(match[1]));
  }
  return results;
}

/**
 * 原始键值对映射到标准 TeacherInfo 对象
 */
function mapToTeacherFields(data: Record<string, string>): TeacherInfo {
  const find = (...keywords: string[]) => {
    const entry = Object.entries(data).find(([k]) =>
      keywords.some((kw) => k.includes(kw))
    );
    return entry ? entry[1] : undefined;
  };

  return {
    name: find('教师姓名'),
    gender: find('性别'),
    campus: find('所在校区', '校区'),
    department: find('所在部门', '部门'),
    joinDate: find('来校时间'),
    ethnicity: find('民族'),
    education: find('学历'),
    degree: find('学位'),
    title: find('职称'),
    partyPosition: find('党政职务'),
    teachingUnit: find('任课单位'),
    section: find('所属系室'),
    graduateSchool: find('毕业学校'),
    graduateMajor: find('毕业专业'),
    officePhone: find('办公电话'),
    mobilePhone: find('移动电话'),
    officeAddress: find('办公地址'),
    qq: find('QQ号码', 'QQ'),
    email: find('电子邮件', '邮箱'),
    mainCourses: find('主要承担课程', '承担课程'),
    researchDirection: find('研究方向'),
    achievements: find('主要成果', '获奖情况'),
    teacherMessage: find('教师寄语'),
    updateDate: find('更新日期'),
  };
}
