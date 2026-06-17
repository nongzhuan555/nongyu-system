/**
 * 教务通知提取模块
 * 负责从教务首页提取教学通知和竞赛通知列表
 */

import { stripTags } from '../utils/html';

/**
 * 教务通知项定义
 */
export interface NoticeItem {
  title: string;  // 通知标题
  url: string;    // 通知详情链接
  date?: string;  // 发布日期
}

/**
 * 教务通知提取结果接口
 */
export interface NoticeResult {
  result: NoticeItem[]; // 通知列表
  success: boolean;     // 提取状态
}

/**
 * 提取配置选项
 */
interface ExtractOptions {
  searchStrategy: 'keyword' | 'comment_or_keyword'; // 搜索策略
  fallbackKeyword?: string;                          // 备选关键字
  limit?: number;                                   // 提取数量限制
}

/**
 * 教务通知基础跳转地址
 */
const BASE_NOTICE_URL = 'https://jiaowu.sicau.edu.cn/web/web/web/';

/**
 * 提取教学通知
 * 
 * @param html 教务网首页 HTML
 * @returns 教学通知列表结果
 */
export const extractTeachingNotices = (html: string): NoticeResult => {
  return extractNotices(html, '教学通知', {
    searchStrategy: 'keyword',
    limit: 50,
  });
};

/**
 * 提取竞赛通知
 * 
 * @param html 教务网首页 HTML
 * @returns 竞赛通知列表结果
 */
export const extractCompetitionNotices = (html: string): NoticeResult => {
  return extractNotices(html, '竞赛通知内容开始', {
    searchStrategy: 'comment_or_keyword',
    fallbackKeyword: '竞赛通知',
    limit: 50,
  });
};

/**
 * 核心提取逻辑
 * 
 * 1. 在页面中定位指定的锚点文字
 * 2. 截取锚点后的内容进行解析
 * 3. 利用正则匹配 `<a>` 标签和日期 `<span>`
 * 
 * @param html 原始 HTML
 * @param anchor 定位锚点
 * @param options 配置项
 */
function extractNotices(html: string, anchor: string, options: ExtractOptions): NoticeResult {
  if (!html || typeof html !== 'string') {
    return { result: [], success: false };
  }

  const { searchStrategy, fallbackKeyword, limit = 50 } = options;
  
  // 1. 定位内容区域
  let content = html;
  let anchorIndex = html.indexOf(anchor);

  // 如果首选锚点没找到，尝试使用备选关键字
  if (anchorIndex === -1 && searchStrategy === 'comment_or_keyword' && fallbackKeyword) {
    anchorIndex = html.indexOf(fallbackKeyword);
  }

  if (anchorIndex !== -1) {
    content = html.slice(anchorIndex);
  }

  // 2. 匹配列表项
  // Regex: 匹配 href, title(或文本内容) 以及日期
  const itemRegex = /<a\s+href="([^"]+)"\s+title="([^"]*)">([\s\S]*?)<\/a>[\s\S]*?<span>\[(.*?)\]<\/span>/gi;
  
  const list: NoticeItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(content)) !== null) {
    if (list.length >= limit) break;

    const rawUrl = match[1];
    const rawTitle = match[2] || stripTags(match[3]);
    const date = match[4]?.trim();

    const url = normalizeUrl(rawUrl);
    const title = cleanTitle(rawTitle);

    if (title && url) {
      list.push({ title, url, date });
    }
  }

  return { 
    result: list, 
    success: true,
  };
}

/**
 * 标准化 URL 地址
 * 将相对路径转换为完整的教务网链接
 */
function normalizeUrl(url: string): string {
  if (!url || url.startsWith('http') || url.startsWith('javascript')) {
    return url;
  }

  // 处理教务网常见的相对路径格式
  const cleanPath = url.startsWith('../web/') ? url.substring(7) : url;
  return `${BASE_NOTICE_URL}${cleanPath}`;
}

/**
 * 清洗标题文本
 * 压缩空格，移除 HTML 实体
 */
function cleanTitle(title: string): string {
  return title
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim();
}
