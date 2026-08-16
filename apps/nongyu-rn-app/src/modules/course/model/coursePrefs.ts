/** 课表卡片行高 / 字号档位 */
export type CourseSizeScale = "sm" | "md" | "lg";

export const COURSE_SIZE_SCALES: CourseSizeScale[] = ["sm", "md", "lg"];

export const COURSE_SIZE_LABELS: Record<CourseSizeScale, string> = {
  sm: "小",
  md: "中",
  lg: "大",
};

/** 大课区间行高（px）；中档在周视图按可视区均分（fillViewport），此值为回退参考 */
export const COURSE_ROW_HEIGHT: Record<CourseSizeScale, number> = {
  sm: 100,
  md: 110,
  lg: 130,
};

/** 卡片课名字号（对齐旧版默认 10） */
export const COURSE_NAME_FONT: Record<CourseSizeScale, number> = {
  sm: 10,
  md: 10,
  lg: 12,
};

/** 卡片教师/教室字号（对齐旧版默认 9） */
export const COURSE_META_FONT: Record<CourseSizeScale, number> = {
  sm: 9,
  md: 9,
  lg: 10,
};

export function parseCourseSizeScale(raw: string | undefined): CourseSizeScale {
  if (raw === "sm" || raw === "md" || raw === "lg") return raw;
  return "md";
}
