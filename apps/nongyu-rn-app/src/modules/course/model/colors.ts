import type { CourseColor } from "./types";

/**
 * 课表卡片颜色池（对齐旧版 CourseTable COURSE_COLORS）
 * 日程选色与课程着色共用，禁止在 UI 侧另写一套 hex
 */
export const COURSE_COLOR_PALETTE: readonly CourseColor[] = [
  { bg: "#E8F1FF", text: "#2B5797" },
  { bg: "#FDF2F4", text: "#B8325E" },
  { bg: "#E6F7F3", text: "#00856F" },
  { bg: "#FFF7E6", text: "#B36B00" },
  { bg: "#F2F0FA", text: "#5B4FA2" },
  { bg: "#EBF9F9", text: "#007C89" },
  { bg: "#FFF9E6", text: "#997B00" },
  { bg: "#F0F4F8", text: "#3E5463" },
] as const;

/**
 * 合法色板下标 → 颜色；非法 / null / undefined → null（日程无色默认样式）
 */
export function getPaletteColor(index: number | null | undefined): CourseColor | null {
  if (index == null || !Number.isInteger(index)) return null;
  if (index < 0 || index >= COURSE_COLOR_PALETTE.length) return null;
  return COURSE_COLOR_PALETTE[index]!;
}

/**
 * 课程名 → 稳定颜色（同名同色）
 */
export function getCourseColor(name: string): CourseColor {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COURSE_COLOR_PALETTE.length;
  return COURSE_COLOR_PALETTE[index]!;
}
