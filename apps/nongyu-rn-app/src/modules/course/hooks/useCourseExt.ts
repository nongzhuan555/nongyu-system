import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import {
  addNote,
  addSchedule,
  addTodo,
  editNote,
  editSchedule,
  editTodo,
  flushOutbox,
  loadLocalCourseExt,
  pullCourseExt,
  removeAttendance,
  removeNote,
  removeSchedule,
  removeTodo,
  upsertAttendance,
} from "../data/courseExtRepository";
import type { CourseAttendance, CourseNote, CourseTodo, ScheduleEntry } from "../model/types";
import { useSessionStore } from "@/stores/session";

const EXT_QUERY_KEY = "course-ext" as const;

/** 稳定空快照：避免 data 未就绪时每次 render 新建 [] 触发下游 effect 死循环 */
const EMPTY_COURSE_EXT = {
  schedules: [] as ScheduleEntry[],
  notes: [] as CourseNote[],
  todos: [] as CourseTodo[],
  attendances: [] as CourseAttendance[],
};

/**
 * 课表扩展数据：本地优先 + pull（含 tombstone）+ outbox flush
 * App 回前台时自动 flush outbox
 */
export function useCourseExt() {
  const queryClient = useQueryClient();
  const studentId = useSessionStore((s) => s.profile?.studentId);
  const queryKey = [EXT_QUERY_KEY, studentId ?? ""] as const;
  const flushingRef = useRef(false);

  const { data } = useQuery({
    queryKey,
    enabled: !!studentId,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
    queryFn: async () => {
      if (!studentId) {
        return EMPTY_COURSE_EXT;
      }
      const local = loadLocalCourseExt(studentId);
      pullCourseExt(studentId)
        .then((remote) => {
          queryClient.setQueryData(queryKey, remote);
        })
        .catch(() => {});
      return local;
    },
  });

  const runFlush = useCallback(async () => {
    if (!studentId || flushingRef.current) return;
    flushingRef.current = true;
    try {
      await flushOutbox(studentId);
      queryClient.invalidateQueries({ queryKey });
    } catch {
      // ignore
    } finally {
      flushingRef.current = false;
    }
  }, [queryClient, queryKey, studentId]);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === "active") void runFlush();
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [runFlush]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const snapshot = data ?? EMPTY_COURSE_EXT;

  const createScheduleMut = useMutation({
    mutationFn: async (entry: ScheduleEntry) => {
      if (!studentId) throw new Error("未登录");
      await addSchedule(studentId, entry);
    },
    onSuccess: invalidate,
  });

  const updateScheduleMut = useMutation({
    mutationFn: async (args: {
      id: string;
      patch: Partial<Omit<ScheduleEntry, "id" | "studentId" | "createdAt">>;
    }) => {
      if (!studentId) throw new Error("未登录");
      await editSchedule(studentId, args.id, args.patch);
    },
    onSuccess: invalidate,
  });

  const deleteScheduleMut = useMutation({
    mutationFn: async (id: string) => {
      if (!studentId) throw new Error("未登录");
      await removeSchedule(studentId, id);
    },
    onSuccess: invalidate,
  });

  const createNoteMut = useMutation({
    mutationFn: async (note: CourseNote) => {
      if (!studentId) throw new Error("未登录");
      await addNote(studentId, note);
    },
    onSuccess: invalidate,
  });

  const updateNoteMut = useMutation({
    mutationFn: async (args: { id: string; patch: { content?: string; updatedAt: string } }) => {
      if (!studentId) throw new Error("未登录");
      await editNote(studentId, args.id, args.patch);
    },
    onSuccess: invalidate,
  });

  const deleteNoteMut = useMutation({
    mutationFn: async (id: string) => {
      if (!studentId) throw new Error("未登录");
      await removeNote(studentId, id);
    },
    onSuccess: invalidate,
  });

  const createTodoMut = useMutation({
    mutationFn: async (todo: CourseTodo) => {
      if (!studentId) throw new Error("未登录");
      await addTodo(studentId, todo);
    },
    onSuccess: invalidate,
  });

  const updateTodoMut = useMutation({
    mutationFn: async (args: {
      id: string;
      patch: {
        content?: string;
        status?: "pending" | "done";
        dueDate?: string | null;
        completedAt?: string | null;
        updatedAt: string;
      };
    }) => {
      if (!studentId) throw new Error("未登录");
      await editTodo(studentId, args.id, args.patch);
    },
    onSuccess: invalidate,
  });

  const deleteTodoMut = useMutation({
    mutationFn: async (id: string) => {
      if (!studentId) throw new Error("未登录");
      await removeTodo(studentId, id);
    },
    onSuccess: invalidate,
  });

  const upsertAttendanceMut = useMutation({
    mutationFn: async (entry: CourseAttendance) => {
      if (!studentId) throw new Error("未登录");
      await upsertAttendance(studentId, entry);
    },
    onSuccess: invalidate,
  });

  const deleteAttendanceMut = useMutation({
    mutationFn: async (id: string) => {
      if (!studentId) throw new Error("未登录");
      await removeAttendance(studentId, id);
    },
    onSuccess: invalidate,
  });

  return {
    schedules: snapshot.schedules,
    notes: snapshot.notes,
    todos: snapshot.todos,
    attendances: snapshot.attendances,
    createSchedule: createScheduleMut.mutateAsync,
    updateSchedule: updateScheduleMut.mutateAsync,
    deleteSchedule: deleteScheduleMut.mutateAsync,
    createNote: createNoteMut.mutateAsync,
    updateNote: updateNoteMut.mutateAsync,
    deleteNote: deleteNoteMut.mutateAsync,
    createTodo: createTodoMut.mutateAsync,
    updateTodo: updateTodoMut.mutateAsync,
    deleteTodo: deleteTodoMut.mutateAsync,
    upsertAttendance: upsertAttendanceMut.mutateAsync,
    deleteAttendance: deleteAttendanceMut.mutateAsync,
  };
}
