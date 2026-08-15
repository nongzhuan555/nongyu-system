import type { AgentChatSession } from "./types";

export type SessionGroupKey = "today" | "yesterday" | "earlier";

export type SessionGroup = {
  key: SessionGroupKey;
  title: string;
  sessions: AgentChatSession[];
};

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * 按 updatedAt 分为今天 / 昨天 / 更早（组内已按 updatedAt 降序）
 */
export function groupSessionsByUpdatedAt(sessions: AgentChatSession[]): SessionGroup[] {
  const now = Date.now();
  const todayStart = startOfDay(now);
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

  const today: AgentChatSession[] = [];
  const yesterday: AgentChatSession[] = [];
  const earlier: AgentChatSession[] = [];

  for (const s of sessions) {
    if (s.updatedAt >= todayStart) today.push(s);
    else if (s.updatedAt >= yesterdayStart) yesterday.push(s);
    else earlier.push(s);
  }

  const groups: SessionGroup[] = [];
  if (today.length) groups.push({ key: "today", title: "今天", sessions: today });
  if (yesterday.length) groups.push({ key: "yesterday", title: "昨天", sessions: yesterday });
  if (earlier.length) groups.push({ key: "earlier", title: "更早", sessions: earlier });
  return groups;
}

/**
 * 列表次要时间文案
 */
export function formatSessionTime(updatedAt: number): string {
  const d = new Date(updatedAt);
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const todayStart = startOfDay(now.getTime());
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

  if (updatedAt >= todayStart) return hm;
  if (updatedAt >= yesterdayStart) return `昨天 ${hm}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}
