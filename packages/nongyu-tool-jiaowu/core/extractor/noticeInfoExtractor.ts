/**
 * 教务通知提取模块
 * 负责从教务首页提取教学通知列表（竞赛见 competitionInfoExtractor）
 */

import { stripTags } from "../utils/html";

/**
 * 教务通知项定义
 */
export interface NoticeItem {
  title: string; // 通知标题
  url: string; // 通知详情链接
  date?: string; // 发布日期
}

/**
 * 教务通知提取结果接口
 */
export interface NoticeResult {
  result: NoticeItem[]; // 通知列表
  success: boolean; // 提取状态
}

/**
 * 教务通知基础跳转地址
 */
const BASE_NOTICE_URL = "https://jiaowu.sicau.edu.cn/web/web/web/";

/**
 * 匹配通知条目：允许 href/title 之间或其后再跟 onclick 等属性
 * 不依赖属性顺序
 */
const NOTICE_ITEM_REGEX =
  /<a\b(?=[^>]*\bhref="([^"]+)")(?=[^>]*\btitle="([^"]*)")[^>]*>([\s\S]*?)<\/a>[\s\S]*?<span>\[([^\]]*)\]<\/span>/gi;

/**
 * 提取教学通知（仅第一个「教学通知」选项卡对应的 notice1 列表）
 */
export const extractTeachingNotices = (html: string): NoticeResult => {
  if (!html || typeof html !== "string") {
    return { result: [], success: false };
  }

  const section = sliceFirstNotice1UlAfter(html, "教学通知");
  const list = parseNoticeListItems(section, 50);

  return {
    result: list,
    success: true,
  };
};

/**
 * @deprecated 请使用 extractCompetitionInfo；保留以免旧调用断裂
 */
export const extractCompetitionNotices = (html: string): NoticeResult => {
  if (!html || typeof html !== "string") {
    return { result: [], success: false };
  }

  const section = sliceBetweenAnchors(html, "竞赛通知内容开始", "竞赛通知内容结束", "竞赛通知");
  const list = parseNoticeListItems(section, 50);

  return {
    result: list,
    success: true,
  };
};

/**
 * 从 HTML 片段解析通知条目
 */
export function parseNoticeListItems(html: string, limit = 50): NoticeItem[] {
  const list: NoticeItem[] = [];
  NOTICE_ITEM_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = NOTICE_ITEM_REGEX.exec(html)) !== null) {
    if (list.length >= limit) break;

    const rawUrl = match[1];
    const rawTitle = match[2] || stripTags(match[3]);
    const date = match[4]?.trim();

    const url = normalizeNoticeUrl(rawUrl);
    const title = cleanTitle(rawTitle);

    if (title && url) {
      list.push({ title, url, date });
    }
  }

  return list;
}

/**
 * 关键字后第一个 `<ul class="notice1">…</ul>`，避免串入长期公告/竞赛/新闻
 */
export function sliceFirstNotice1UlAfter(html: string, keyword: string): string {
  const kwIndex = html.indexOf(keyword);
  const from = kwIndex === -1 ? html : html.slice(kwIndex);
  const ulMatch = from.match(/<ul\s+class=["']?notice1["']?[^>]*>/i);
  if (!ulMatch || ulMatch.index === undefined) {
    return from;
  }
  const ulStart = ulMatch.index;
  const afterOpen = from.slice(ulStart);
  const closeIdx = afterOpen.search(/<\/ul>/i);
  if (closeIdx === -1) {
    return afterOpen;
  }
  return afterOpen.slice(0, closeIdx + "</ul>".length);
}

/**
 * 截取开始锚点到结束锚点之间；无开始则尝试 fallback；无结束则切到末尾
 */
export function sliceBetweenAnchors(
  html: string,
  startAnchor: string,
  endAnchor: string,
  fallbackStart?: string,
): string {
  let start = html.indexOf(startAnchor);
  if (start === -1 && fallbackStart) {
    start = html.indexOf(fallbackStart);
  }
  if (start === -1) {
    return html;
  }
  let section = html.slice(start);
  const end = section.indexOf(endAnchor);
  if (end !== -1) {
    section = section.slice(0, end);
  }
  return section;
}

/**
 * 标准化 URL（相对路径补全；已是 http(s) 的保持原样）
 */
export function normalizeNoticeUrl(url: string): string {
  if (!url || url.startsWith("http") || url.startsWith("javascript")) {
    return url;
  }
  const cleanPath = url.startsWith("../web/") ? url.substring(7) : url;
  return `${BASE_NOTICE_URL}${cleanPath}`;
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s+/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();
}
