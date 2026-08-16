import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getExamInfo } from "nongyu-tool-jiaowu";
import { useJiaowuQuery } from "@/modules/jiaowu/hooks/useJiaowuQuery";
import { useSessionStore } from "@/stores/session";
import { loadLocalCourseExt } from "../data/courseExtRepository";
import { readLocalCourses } from "../data/courseLocalStore";
import { mergeAdjacentCourseEntries } from "../model/mapJiaowuCourseItems";
import { useCourseUiStore } from "../store/courseUiStore";
import { clearWidgetSchedule, writeWidgetSchedule } from "./writeWidgetSchedule";
import type { CourseExtSnapshot } from "../data/courseExtRepository";
import type { CourseEntry } from "../model/types";

function isWidgetSourceQuery(queryKey: readonly unknown[]): boolean {
  return (queryKey[0] === "jiaowu" && queryKey[1] === "course") || queryKey[0] === "course-ext";
}

/**
 * 已登录时把课表/日程/考试快照同步到 Android 小组件。
 * 课表本体不在此发起 Query，只读 MMKV / 已有缓存，避免与课表页抢 queryFn。
 */
export function CourseWidgetSyncHost() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const studentId = useSessionStore((s) => s.profile?.studentId);
  const semesterStartMs = useCourseUiStore((s) => s.semesterStartMs);
  const queryClient = useQueryClient();
  const [cacheTick, setCacheTick] = useState(0);

  const examQuery = useJiaowuQuery({
    resource: "exam",
    requireAuth: true,
    queryFn: getExamInfo,
  });

  useEffect(() => {
    return queryClient.getQueryCache().subscribe((event) => {
      // 仅数据增删改时刷新；observer 通知会随本组件 setState 再触发，否则会无限重渲染
      if (event.type !== "added" && event.type !== "updated" && event.type !== "removed") {
        return;
      }
      if (event.query && isWidgetSourceQuery(event.query.queryKey)) {
        setCacheTick((n) => n + 1);
      }
    });
  }, [queryClient]);

  useEffect(() => {
    if (!isAuthenticated || !studentId) {
      void clearWidgetSchedule();
      return;
    }
    const cachedCourses = queryClient.getQueryData<CourseEntry[]>(["jiaowu", "course", studentId]);
    const cachedExt = queryClient.getQueryData<CourseExtSnapshot>(["course-ext", studentId]);
    const courses = cachedCourses ?? readLocalCourses(studentId) ?? [];
    const schedules = cachedExt?.schedules ?? loadLocalCourseExt(studentId).schedules;
    void writeWidgetSchedule({
      courses: mergeAdjacentCourseEntries(courses),
      schedules,
      semesterStart: semesterStartMs != null ? new Date(semesterStartMs) : null,
      exams: examQuery.data ?? [],
      examReady: examQuery.isSuccess,
    });
  }, [
    cacheTick,
    examQuery.data,
    examQuery.isSuccess,
    isAuthenticated,
    queryClient,
    semesterStartMs,
    studentId,
  ]);

  return null;
}
