/**
 * 竞赛通知提取模块
 * 负责从教务首页 HTML 中解析竞赛通知列表
 */

import {
  parseNoticeListItems,
  sliceBetweenAnchors,
  type NoticeItem,
  type NoticeResult,
} from "./noticeInfoExtractor";

export type { NoticeItem, NoticeResult };

/**
 * 竞赛通知锚点标记（页面 HTML 注释）
 */
const COMPETITION_START = "竞赛通知内容开始";
const COMPETITION_END = "竞赛通知内容结束";
const FALLBACK_KEYWORD = "竞赛通知";
const MAX_ITEMS = 50;

/**
 * 提取竞赛通知：注释「开始」到「结束」之间，避免串入新闻动态
 */
export const extractCompetitionInfo = (html: string): NoticeResult => {
  if (!html || typeof html !== "string") {
    return { result: [], success: false };
  }

  const content = sliceBetweenAnchors(html, COMPETITION_START, COMPETITION_END, FALLBACK_KEYWORD);
  const list = parseNoticeListItems(content, MAX_ITEMS);

  return { result: list, success: true };
};
