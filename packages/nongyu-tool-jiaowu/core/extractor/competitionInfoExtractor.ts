/**
 * 竞赛通知提取模块
 * 负责从教务首页 HTML 中解析竞赛通知列表
 */

import { stripTags } from '../utils/html';
import type { NoticeItem, NoticeResult } from './noticeInfoExtractor';

export type { NoticeItem, NoticeResult };

/**
 * 教务通知基础跳转地址
 */
const BASE_NOTICE_URL = 'https://jiaowu.sicau.edu.cn/web/web/web/';

/**
 * 竞赛通知锚点标记（页面 HTML 注释）
 * 教务首页用该注释分隔竞赛通知区域：
 * <!---------------------------------------------------------------竞赛通知内容开始------------------------------>
 */
const COMPETITION_ANCHOR = '竞赛通知内容开始';

/**
 * 备选关键字：当页面中没有注释标记时，回退按此关键字搜索
 */
const FALLBACK_KEYWORD = '竞赛通知';

/**
 * 最大提取条数
 */
const MAX_ITEMS = 50;

/**
 * 提取竞赛通知
 *
 * 策略：
 * 1. 优先通过页面 HTML 注释 "竞赛通知内容开始" 定位竞赛通知区域
 * 2. 若注释不存在，回退到按 "竞赛通知" 关键字搜索
 * 3. 在定位区域内用正则匹配通知条目（标题、链接、日期）
 *
 * @param html 教务网首页完整 HTML 字符串
 * @returns 包含竞赛通知列表的结果对象
 *
 * @example
 * const { result, success } = extractCompetitionInfo(html);
 * if (success) {
 *   result.forEach(item => console.log(item.title, item.url, item.date));
 * }
 */
export const extractCompetitionInfo = (html: string): NoticeResult => {
  if (!html || typeof html !== 'string') {
    return { result: [], success: false };
  }

  // 1. 定位竞赛通知区域
  const content = locateCompetitionSection(html);

  // 2. 解析通知条目
  const list = parseNoticeItems(content);

  return { result: list, success: true };
};

/**
 * 定位竞赛通知所在的 HTML 片段
 *
 * 优先匹配 HTML 注释标记，失败则回退到关键字匹配。
 * 截取标记之后的内容返回，以缩小后续正则匹配范围。
 */
function locateCompetitionSection(html: string): string {
  // 尝试按注释标记定位
  let index = html.indexOf(COMPETITION_ANCHOR);

  // 注释标记未命中，回退到按关键字定位
  if (index === -1) {
    index = html.indexOf(FALLBACK_KEYWORD);
  }

  return index !== -1 ? html.slice(index) : html;
}

/**
 * 从 HTML 片段中解析通知条目列表
 *
 * 正则匹配模式：
 *   <a href="URL" title="标题">文本</a> ... <span>[日期]</span>
 */
function parseNoticeItems(html: string): NoticeItem[] {
  const itemRegex =
    /<a\s+href="([^"]+)"\s+title="([^"]*)">([\s\S]*?)<\/a>[\s\S]*?<span>\[(.*?)\]<\/span>/gi;

  const list: NoticeItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(html)) !== null) {
    if (list.length >= MAX_ITEMS) break;

    const rawUrl = match[1];
    const rawTitle = match[2] || stripTags(match[3]);
    const date = match[4]?.trim();

    const url = normalizeUrl(rawUrl);
    const title = cleanTitle(rawTitle);

    if (title && url) {
      list.push({ title, url, date });
    }
  }

  return list;
}

/**
 * 将相对路径转换为完整的教务网链接
 */
function normalizeUrl(url: string): string {
  if (!url || url.startsWith('http') || url.startsWith('javascript')) {
    return url;
  }

  const cleanPath = url.startsWith('../web/') ? url.slice(7) : url;
  return `${BASE_NOTICE_URL}${cleanPath}`;
}

/**
 * 清洗标题文本：压缩多余空格、移除 HTML 实体
 */
function cleanTitle(title: string): string {
  return title
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim();
}
