import { create } from "zustand";
import {
  appStorage,
  COURSE_BACKGROUND_URI_KEY,
  COURSE_CARD_SIZE_KEY,
  COURSE_FONT_SIZE_KEY,
  COURSE_HIGHLIGHT_TODAY_KEY,
  COURSE_SEMESTER_START_KEY,
} from "@/storage/mmkv";
import { parseCourseSizeScale, type CourseSizeScale } from "../model/coursePrefs";
import type { CourseEntry } from "../model/types";

function readSemesterStartMs(): number | null {
  const raw = appStorage.getString(COURSE_SEMESTER_START_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function readHighlightToday(): boolean {
  const raw = appStorage.getString(COURSE_HIGHLIGHT_TODAY_KEY);
  if (raw === undefined) return true;
  return raw !== "0";
}

function readBackgroundUri(): string | null {
  return appStorage.getString(COURSE_BACKGROUND_URI_KEY) ?? null;
}

export type CourseViewMode = "self" | "peer" | "diff";
export type CourseDiffMode = "conflict" | "free";

export type PeerSnapshot = {
  studentNo: string;
  courses: CourseEntry[];
  updatedAt: string;
};

type CourseUiState = {
  semesterStartMs: number | null;
  highlightTodayColumn: boolean;
  backgroundUri: string | null;
  cardSize: CourseSizeScale;
  fontSize: CourseSizeScale;
  /** FlatList 当前页 0-based */
  viewWeekIndex: number;
  viewMode: CourseViewMode;
  peer: PeerSnapshot | null;
  diffMode: CourseDiffMode;
  setSemesterStart: (date: Date | null) => void;
  setHighlightTodayColumn: (value: boolean) => void;
  setBackgroundUri: (uri: string | null) => void;
  setCardSize: (size: CourseSizeScale) => void;
  setFontSize: (size: CourseSizeScale) => void;
  setViewWeekIndex: (index: number) => void;
  enterPeerView: (peer: PeerSnapshot) => void;
  enterDiffView: () => void;
  setDiffMode: (mode: CourseDiffMode) => void;
  /** 从 Agent 打开 Diff 并钉住周次，避免课表页自动跳回当前周 */
  openPeerDiff: (peer: PeerSnapshot, diffMode: CourseDiffMode, weekIndex: number) => void;
  exitPeerView: () => void;
  /** 为 true 时课表页不自动改 viewWeekIndex */
  weekPinned: boolean;
};

/**
 * 课表 UI 偏好：开学日 / 高亮 / 背景 / 卡片与字号；展示周与共享查看态仅内存
 */
export const useCourseUiStore = create<CourseUiState>((set, get) => ({
  semesterStartMs: readSemesterStartMs(),
  highlightTodayColumn: readHighlightToday(),
  backgroundUri: readBackgroundUri(),
  cardSize: parseCourseSizeScale(appStorage.getString(COURSE_CARD_SIZE_KEY)),
  fontSize: parseCourseSizeScale(appStorage.getString(COURSE_FONT_SIZE_KEY)),
  viewWeekIndex: 0,
  viewMode: "self",
  peer: null,
  diffMode: "conflict",
  weekPinned: false,
  setSemesterStart: (date) => {
    if (!date) {
      appStorage.delete(COURSE_SEMESTER_START_KEY);
      set({ semesterStartMs: null });
      return;
    }
    const ms = date.getTime();
    appStorage.set(COURSE_SEMESTER_START_KEY, String(ms));
    set({ semesterStartMs: ms });
  },
  setHighlightTodayColumn: (value) => {
    appStorage.set(COURSE_HIGHLIGHT_TODAY_KEY, value ? "1" : "0");
    set({ highlightTodayColumn: value });
  },
  setBackgroundUri: (uri) => {
    if (!uri) {
      appStorage.delete(COURSE_BACKGROUND_URI_KEY);
      set({ backgroundUri: null });
      return;
    }
    appStorage.set(COURSE_BACKGROUND_URI_KEY, uri);
    set({ backgroundUri: uri });
  },
  setCardSize: (size) => {
    appStorage.set(COURSE_CARD_SIZE_KEY, size);
    set({ cardSize: size });
  },
  setFontSize: (size) => {
    appStorage.set(COURSE_FONT_SIZE_KEY, size);
    set({ fontSize: size });
  },
  setViewWeekIndex: (index) => set({ viewWeekIndex: Math.max(0, index) }),
  enterPeerView: (peer) => set({ viewMode: "peer", peer, diffMode: "conflict", weekPinned: false }),
  enterDiffView: () => {
    if (!get().peer) return;
    set({ viewMode: "diff" });
  },
  setDiffMode: (mode) => set({ diffMode: mode }),
  openPeerDiff: (peer, diffMode, weekIndex) =>
    set({
      viewMode: "diff",
      peer,
      diffMode,
      viewWeekIndex: Math.max(0, weekIndex),
      weekPinned: true,
    }),
  exitPeerView: () =>
    set({ viewMode: "self", peer: null, diffMode: "conflict", weekPinned: false }),
}));
