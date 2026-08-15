import type { CourseColor } from "./types";

/**
 * 课表卡片颜色池（对齐旧版 CourseTable COURSE_COLORS）
 */
const COURSE_COLORS: CourseColor[] = [
  { bg: "#E8F1FF", text: "#2B5797" },
  { bg: "#FDF2F4", text: "#B8325E" },
  { bg: "#E6F7F3", text: "#00856F" },
  { bg: "#FFF7E6", text: "#B36B00" },
  { bg: "#F2F0FA", text: "#5B4FA2" },
  { bg: "#EBF9F9", text: "#007C89" },
  { bg: "#FFF9E6", text: "#997B00" },
  { bg: "#F0F4F8", text: "#3E5463" },
];

/**
 * 课程名 → 稳定颜色（同名同色）
 */
export function getCourseColor(name: string): CourseColor {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COURSE_COLORS.length;
  return COURSE_COLORS[index]!;
}
