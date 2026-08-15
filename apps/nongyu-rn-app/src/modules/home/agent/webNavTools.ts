/**
 * 常用网站 Agent Tools — 搜索 / 打开（白名单 WEB_NAV_ITEMS）
 */
import { z } from "zod";
import { tool } from "nongyu-agent-sdk";
import { openAppUrl } from "@/lib/openAppUrl";
import { WEB_NAV_ITEMS, type WebNavItem } from "@/modules/home/constants/webNav";

/**
 * 按关键词过滤站点（与首页 WebNav 一致：名称 includes）
 */
export function searchWebNavItems(keyword?: string): WebNavItem[] {
  const q = keyword?.trim() ?? "";
  if (!q) return [...WEB_NAV_ITEMS];
  return WEB_NAV_ITEMS.filter((item) => item.text.includes(q));
}

/**
 * 解析打开目标：精确 → 唯一模糊；否则返回错误信息
 */
export function resolveWebNavOpen(
  name: string,
): { ok: true; item: WebNavItem } | { ok: false; error: string; candidates?: WebNavItem[] } {
  const raw = name.trim();
  if (!raw) {
    return { ok: false, error: "请提供站点名称" };
  }

  const exact = WEB_NAV_ITEMS.find((item) => item.text === raw);
  if (exact) return { ok: true, item: exact };

  const fuzzy = WEB_NAV_ITEMS.filter((item) => item.text.includes(raw));
  if (fuzzy.length === 1) return { ok: true, item: fuzzy[0]! };
  if (fuzzy.length === 0) {
    return { ok: false, error: `未找到站点「${raw}」，可先用 web_nav_search 搜索` };
  }
  return {
    ok: false,
    error: `「${raw}」匹配到多个站点，请改用更精确的名称`,
    candidates: fuzzy,
  };
}

/**
 * web_nav_open 确认框文案
 */
export function formatWebNavOpenConfirmMessage(input: unknown): string {
  const name =
    input && typeof input === "object" && "name" in input
      ? String((input as { name: unknown }).name ?? "").trim()
      : "";
  const resolved = name ? resolveWebNavOpen(name) : null;
  if (resolved?.ok) {
    return `即将打开「${resolved.item.text}」\n${resolved.item.url}`;
  }
  if (name) return `即将尝试打开「${name}」`;
  return "即将打开常用网站中的站点";
}

export const webNavSearchTool = tool({
  name: "web_nav_search",
  description:
    "搜索农屿首页「常用网站」白名单站点。keyword 为空或省略时返回全部站点名称与链接；有关键词时按名称包含过滤（与首页搜索一致）。结果以 JSON 返回，请口头向用户列出。",
  inputSchema: z.object({
    keyword: z.string().optional().describe("站点名称关键词；空=全部"),
  }),
  async execute({ keyword }) {
    const items = searchWebNavItems(keyword);
    return JSON.stringify({
      items: items.map((it) => ({ text: it.text, url: it.url })),
      total: items.length,
    });
  },
});

export const webNavOpenTool = tool({
  name: "web_nav_open",
  description:
    "打开农屿「常用网站」白名单中的站点（按名称）。仅允许列表内站点，禁止任意外链。名称先精确匹配，否则唯一模糊包含命中也可；多命中则失败并返回 candidates。执行前会弹出确认框。打开方式跟随「网页跳转」设置（应用内 WebView 或系统浏览器）。",
  inputSchema: z.object({
    name: z.string().min(1).describe("站点显示名，如「教务网」「川农图书馆」"),
  }),
  needsApproval: true,
  async execute({ name }) {
    const resolved = resolveWebNavOpen(name);
    if (!resolved.ok) {
      return JSON.stringify({
        ok: false,
        error: resolved.error,
        candidates: resolved.candidates?.map((it) => ({ text: it.text, url: it.url })),
      });
    }

    await openAppUrl(resolved.item.url, { label: resolved.item.text });
    return JSON.stringify({
      ok: true,
      opened: { text: resolved.item.text, url: resolved.item.url },
    });
  },
});

/**
 * 常用网站工具集合，供 agent.ts 注册
 */
export const webNavTools = {
  web_nav_search: webNavSearchTool,
  web_nav_open: webNavOpenTool,
};
