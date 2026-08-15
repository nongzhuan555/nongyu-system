import dayjs from "dayjs";
import { layoutTokens } from "@/theme/buildThemeTokens";

/**
 * 去掉 HTML 标签，供详情纯文本展示
 */
export function stripHtml(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

/**
 * 发布时间展示
 */
export function formatPublishedAt(iso: string): string {
  const d = dayjs(iso);
  if (!d.isValid()) return iso;
  return d.format("YYYY-MM-DD HH:mm");
}

/** 主 Tab 列表底部留白（避开悬浮底栏） */
export function tabBarContentPadding(): number {
  const tab = layoutTokens.tabBarBase;
  return tab.heightMax + tab.bottomGapMax + layoutTokens.space.xl;
}
