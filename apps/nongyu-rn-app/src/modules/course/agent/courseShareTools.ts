/**
 * 课表共享对比 Agent Tool：只读查找 + Diff 摘要，不开/关共享
 */
import { z } from "zod";
import { tool } from "nongyu-agent-sdk";
import { AppApiError } from "@/api/appApiError";
import { useSessionStore } from "@/stores/session";
import { readLocalCourses } from "../data/courseLocalStore";
import { lookupPeer } from "../data/courseShareRepository";
import { mergeAdjacentCourseEntries } from "../model/mapJiaowuCourseItems";
import {
  buildDiffOverlay,
  collectDiffSlots,
  countDiffKinds,
  type DiffSlotSummary,
  type DiffWeekCounts,
} from "../model/courseShareDiff";
import { computeCurrentWeek } from "../model/semesterWeek";
import { maxWeekFromCourses } from "../model/weekMatrix";
import { useCourseUiStore } from "../store/courseUiStore";

export type CourseShareDiffResult = {
  studentNo: string;
  updatedAt: string;
  week: number;
  scope: "week" | "all";
  mode: "conflict" | "free" | "both";
  conflictSlots: DiffSlotSummary[];
  freeSlots: DiffSlotSummary[];
  counts: { conflict: number; free: number };
  weekCounts?: DiffWeekCounts[];
};

function getStudentId(): string {
  const sid = useSessionStore.getState().profile?.studentId;
  if (!sid) throw new Error("未登录，无法对比课表");
  return sid;
}

function resolveCurrentWeek(maxWeek: number): number {
  const ms = useCourseUiStore.getState().semesterStartMs;
  if (ms == null) return 1;
  const w = computeCurrentWeek(new Date(ms));
  return Math.min(Math.max(1, w), maxWeek);
}

function rethrowLookup(err: unknown): never {
  if (err instanceof AppApiError) {
    throw new Error(err.message);
  }
  throw new Error(err instanceof Error ? err.message : "未找到可查看的课表");
}

export const courseShareDiffTool = tool({
  name: "course_share_diff",
  description:
    "对比当前用户与指定学号同学的共享课表。错开/空档/一起有空用 mode=free；撞课/冲突用 conflict；只说对比用 both。可指定教学周 week，或 weeks=all 按周汇总。对方须已开启课表共享。结果以对比卡片展示，不要编造课表。不能用此工具开关共享。",
  needsApproval: false,
  inputSchema: z.object({
    studentNo: z
      .string()
      .regex(/^\d{9}$/, "请输入 9 位数字学号")
      .describe("对方 9 位学号"),
    week: z.number().int().min(1).max(30).optional().describe("教学周（1-based）；省略则当前周"),
    weeks: z.enum(["all"]).optional().describe("传 all 表示整学期按周汇总"),
    mode: z
      .enum(["conflict", "free", "both"])
      .optional()
      .describe("conflict=撞课，free=双方都空，both=两种摘要；省略视为 both"),
  }),
  render: { component: "CourseShareDiffCard" },
  async execute({ studentNo, week, weeks, mode: modeIn }) {
    const studentId = getStudentId();
    const mine = mergeAdjacentCourseEntries(readLocalCourses(studentId) ?? []);
    if (mine.length === 0) {
      throw new Error("请先到课表页获取课表后再对比");
    }

    let peer: Awaited<ReturnType<typeof lookupPeer>>;
    try {
      peer = await lookupPeer(studentNo);
    } catch (err) {
      rethrowLookup(err);
    }

    const maxWeek = Math.max(maxWeekFromCourses(mine), maxWeekFromCourses(peer.courses), 1);
    const mode = modeIn ?? "both";
    const scope = weeks === "all" ? "all" : "week";
    const focusWeek = Math.min(Math.max(1, week ?? resolveCurrentWeek(maxWeek)), maxWeek);

    const overlay = buildDiffOverlay(focusWeek, mine, peer.courses);
    const counts = countDiffKinds(overlay);
    const wantConflict = mode === "conflict" || mode === "both";
    const wantFree = mode === "free" || mode === "both";

    const result: CourseShareDiffResult = {
      studentNo: peer.studentNo,
      updatedAt: peer.updatedAt,
      week: focusWeek,
      scope,
      mode,
      conflictSlots: wantConflict ? collectDiffSlots(overlay, "both") : [],
      freeSlots: wantFree ? collectDiffSlots(overlay, "neither") : [],
      counts,
    };

    if (scope === "all") {
      const weekCounts: DiffWeekCounts[] = [];
      for (let w = 1; w <= maxWeek; w++) {
        const o = buildDiffOverlay(w, mine, peer.courses);
        const c = countDiffKinds(o);
        weekCounts.push({ week: w, conflictCount: c.conflict, freeCount: c.free });
      }
      result.weekCounts = weekCounts;
      result.conflictSlots = [];
      result.freeSlots = [];
      result.counts = weekCounts.reduce(
        (acc, row) => ({
          conflict: acc.conflict + row.conflictCount,
          free: acc.free + row.freeCount,
        }),
        { conflict: 0, free: 0 },
      );
    }

    return result;
  },
});

export const courseShareTools = {
  course_share_diff: courseShareDiffTool,
};
