import { toast } from "@/components/ui/toast";
import { AppApiError } from "@/api/appApiError";
import type { CourseDiffMode } from "../store/courseUiStore";
import { useCourseUiStore } from "../store/courseUiStore";
import { lookupPeer } from "./courseShareRepository";
import { maxWeekFromCourses } from "../model/weekMatrix";

/**
 * 从 Agent 卡片打开课表 Tab 的 Diff：再拉一次快照（不把完整课表写进对话）
 */
export async function openCourseShareDiff(params: {
  studentNo: string;
  week: number;
  diffMode: CourseDiffMode;
}): Promise<boolean> {
  try {
    const peer = await lookupPeer(params.studentNo);
    const maxWeek = Math.max(maxWeekFromCourses(peer.courses), 1);
    const weekIndex = Math.min(Math.max(0, params.week - 1), maxWeek - 1);
    useCourseUiStore.getState().openPeerDiff(peer, params.diffMode, weekIndex);
    return true;
  } catch (err) {
    const message =
      err instanceof AppApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : "未找到可查看的课表";
    toast.error(message);
    return false;
  }
}
