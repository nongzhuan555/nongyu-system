import { getCourseInfo } from "nongyu-tool-jiaowu";
import type { CourseEntry, WeekRange } from "./types";

/** 与 getCourseInfo 成功结果单项对齐 */
type JiaowuCourseItem = Awaited<ReturnType<typeof getCourseInfo>>["result"][number];

/**
 * FNV-1a 32 位哈希 → 16 进制字符串
 * 用于教务课 id：同课同时段恒定，保证备注/待办绑定稳定
 */
function fnv1aHex(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * 教务课稳定 id：基于 (name, day, startPeriod, endPeriod) 哈希
 * 同课同时段恒定，教务行序变化也不变，备注/待办绑定稳定
 */
export function stableCourseId(
  name: string,
  day: number,
  startPeriod: number,
  endPeriod: number,
): string {
  return `jw-${fnv1aHex(`${name}|${day}|${startPeriod}|${endPeriod}`)}`;
}

type TimeEntry = {
  day: number;
  start: number;
  end: number;
  odd: boolean;
  even: boolean;
};

/**
 * 解析周次列：支持「1-16」或单周「8」
 */
export function parseWeekRange(raw: string): WeekRange | null {
  const s = raw.trim();
  if (!s) return null;
  const range = s.match(/(\d+)\s*[-~至到]\s*(\d+)/);
  if (range) {
    return { start: parseInt(range[1]!, 10), end: parseInt(range[2]!, 10) };
  }
  const single = s.match(/^(\d+)$/);
  if (single) {
    const v = parseInt(single[1]!, 10);
    return { start: v, end: v };
  }
  return null;
}

/**
 * 解析上课时间多行：如「3-3,3-4」「2-9,2-10(单)」
 * 跳过「自行安排 / 在线学习」等无法落格的文案
 */
export function parseScheduleTimeLines(raw: string): TimeEntry[] {
  if (!raw?.trim()) return [];
  const lines = raw
    .split(/\n+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const out: TimeEntry[] = [];
  for (const line of lines) {
    if (/任课教师自行安排|自行在线学习|自行安排/.test(line)) continue;

    const even = /\(双\)/.test(line);
    const odd = /\(单\)/.test(line);
    const cleaned = line.replace(/\(单\)|\(双\)/g, "");
    const nums = cleaned
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const dayStart = nums[0]?.match(/^(\d+)-(\d+)$/);
    if (!dayStart) continue;

    const d1 = parseInt(dayStart[1]!, 10);
    const p1 = parseInt(dayStart[2]!, 10);
    let d2 = d1;
    let p2 = p1;
    const dayEnd = nums[1]?.match(/^(\d+)-(\d+)$/);
    if (dayEnd) {
      d2 = parseInt(dayEnd[1]!, 10);
      p2 = parseInt(dayEnd[2]!, 10);
    }
    if (d1 !== d2) continue;

    out.push({
      day: d1,
      start: Math.min(p1, p2),
      end: Math.max(p1, p2),
      odd,
      even,
    });
  }
  return out;
}

/**
 * 合并同日、同单双、节次首尾相接的时段（教务常拆成多行）
 */
function mergeAdjacentTimeEntries(slots: TimeEntry[]): TimeEntry[] {
  if (slots.length <= 1) return slots.map((s) => ({ ...s }));
  const sorted = [...slots].sort((a, b) => a.day - b.day || a.start - b.start);
  const out: TimeEntry[] = [];
  for (const slot of sorted) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.day === slot.day &&
      prev.odd === slot.odd &&
      prev.even === slot.even &&
      slot.start === prev.end + 1
    ) {
      prev.end = Math.max(prev.end, slot.end);
      continue;
    }
    out.push({ ...slot });
  }
  return out;
}

function weeksEqual(a: CourseEntry, b: CourseEntry): boolean {
  if ((a.weeksList?.length ?? 0) > 0 || (b.weeksList?.length ?? 0) > 0) {
    const la = [...(a.weeksList ?? [])].sort((x, y) => x - y);
    const lb = [...(b.weeksList ?? [])].sort((x, y) => x - y);
    if (la.length !== lb.length) return false;
    return la.every((v, i) => v === lb[i]);
  }
  return a.weeks.start === b.weeks.start && a.weeks.end === b.weeks.end;
}

function canMergeCourseEntries(a: CourseEntry, b: CourseEntry): boolean {
  return (
    a.name === b.name &&
    a.day === b.day &&
    a.teacher === b.teacher &&
    a.odd === b.odd &&
    a.even === b.even &&
    weeksEqual(a, b) &&
    b.startPeriod === a.endPeriod + 1
  );
}

/**
 * 合并相邻连堂条目：同名同天同周次/单双且节次首尾相接。
 * 保留首条 id / 教室（首段空则用后段）；便于备注绑定不因合并整段失效。
 */
export function mergeAdjacentCourseEntries(entries: CourseEntry[]): CourseEntry[] {
  if (entries.length <= 1) return entries.map((e) => ({ ...e }));
  const sorted = [...entries].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    const byName = a.name.localeCompare(b.name, "zh");
    if (byName !== 0) return byName;
    return a.startPeriod - b.startPeriod;
  });
  const out: CourseEntry[] = [];
  for (const cur of sorted) {
    const prev = out[out.length - 1];
    if (prev && canMergeCourseEntries(prev, cur)) {
      prev.endPeriod = Math.max(prev.endPeriod, cur.endPeriod);
      if (!prev.room.trim() && cur.room.trim()) prev.room = cur.room;
      continue;
    }
    out.push({ ...cur });
  }
  return out;
}

/**
 * 教务课表行 → 周视图 CourseEntry[]（一门课可拆多条时段；相邻连堂会合并）
 */
export function mapJiaowuCourseItems(items: JiaowuCourseItem[]): CourseEntry[] {
  const entries: CourseEntry[] = [];

  for (const item of items) {
    const name = (item.courseName || "").trim();
    if (!name) continue;

    const weeks = parseWeekRange(item.weeks || "");
    if (!weeks) continue;

    const teacher = (item.teacher || "").trim();
    const rooms = (item.classroom || "")
      .split(/\n+/)
      .map((t) => t.trim())
      .filter(Boolean);
    const slots = mergeAdjacentTimeEntries(parseScheduleTimeLines(item.scheduleTime || ""));
    if (slots.length === 0) continue;

    slots.forEach((slot, idx) => {
      const day = Math.min(7, Math.max(1, slot.day)) as CourseEntry["day"];
      entries.push({
        id: stableCourseId(name, slot.day, slot.start, slot.end),
        name,
        teacher,
        room: rooms[idx] || rooms[0] || "",
        day,
        startPeriod: slot.start,
        endPeriod: slot.end,
        weeks,
        odd: slot.odd,
        even: slot.even,
      });
    });
  }

  return mergeAdjacentCourseEntries(entries);
}
