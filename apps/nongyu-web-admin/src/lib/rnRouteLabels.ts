/**
 * RN Expo Router pathname → 管理端展示文案。
 * 精确匹配优先，再按最长 `/*` 前缀模式。
 */

const EXACT_LABELS: Record<string, string> = {
  "/home": "首页",
  "/course": "课表",
  "/center": "广场",
  "/mine": "我的",
  "/ai": "农屿 Agent",
  "/web-viewer": "应用内网页",
  "/login": "登录",
  "/center/compose": "发帖",
  "/home/notice": "首页通知",
  "/home/jiaowu": "教务",
  "/home/jiaowu/score": "成绩",
  "/home/jiaowu/exam": "考试安排",
  "/home/jiaowu/plan": "培养方案",
  "/home/jiaowu/progress": "学业进度",
  "/home/jiaowu/rank": "排名",
  "/home/jiaowu/competition": "竞赛",
  "/home/jiaowu/notice": "教务通知",
  "/home/second": "第二课堂",
  "/home/second/login": "二课登录",
  "/home/second/profile": "二课资料",
  "/home/second/activities": "二课活动列表",
  "/mine/profile": "个人资料",
  "/mine/posts": "我的帖子",
  "/mine/settings": "设置",
  "/mine/settings/theme": "主题设置",
  "/mine/settings/course": "课表设置",
  "/mine/settings/launch": "启动设置",
  "/mine/settings/web": "网页打开方式",
  "/mine/settings/agent": "Agent 设置",
  "/mine/settings/version": "版本信息",
};

/** 模式：前缀（不含 /*）→ 中文名，按前缀长度降序匹配 */
const PREFIX_LABELS: Array<{ prefix: string; label: string }> = [
  { prefix: "/home/second/activities/", label: "二课活动详情" },
  { prefix: "/center/post/", label: "帖子详情" },
].sort((a, b) => b.prefix.length - a.prefix.length);

/**
 * 解析 RN 路由展示名；未命中返回 null
 */
export function resolveRnRouteName(pathname: string): string | null {
  const path = pathname.trim() || "/";
  const exact = EXACT_LABELS[path];
  if (exact) return exact;
  for (const row of PREFIX_LABELS) {
    if (path.startsWith(row.prefix)) return row.label;
  }
  return null;
}

/**
 * 大屏轴标签：命中 `首页 (/home)`；未命中 `/foo（未映射）`
 */
export function formatRnRouteLabel(pathname: string): string {
  const path = pathname.trim() || "/";
  const name = resolveRnRouteName(path);
  if (name) return `${name} (${path})`;
  return `${path}（未映射）`;
}
