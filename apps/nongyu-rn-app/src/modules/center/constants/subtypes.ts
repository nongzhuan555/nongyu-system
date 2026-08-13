import type { PostType } from "@/modules/center/api/posts";

export type SubtypeOption = {
  value: string;
  label: string;
};

/** 反馈墙发帖选项 */
export const FEEDBACK_SUBTYPES: SubtypeOption[] = [
  { value: "feedback", label: "反馈" },
  { value: "suggestion", label: "建议" },
  { value: "bug", label: "Bug" },
];

/** 大院发帖选项 */
export const COURTYARD_SUBTYPES: SubtypeOption[] = [
  { value: "life", label: "生活" },
  { value: "study", label: "学习" },
  { value: "other", label: "其他" },
];

const ANNOUNCEMENT_LABELS: Record<string, string> = {
  system: "系统公告",
  activity: "活动公告",
};

/**
 * subtype → 展示文案
 */
export function subtypeLabel(postType: PostType, subtype: string): string {
  if (postType === "announcement") {
    return ANNOUNCEMENT_LABELS[subtype] ?? (subtype || "公告");
  }
  if (postType === "feedback") {
    return FEEDBACK_SUBTYPES.find((o) => o.value === subtype)?.label ?? subtype;
  }
  return COURTYARD_SUBTYPES.find((o) => o.value === subtype)?.label ?? subtype;
}

/**
 * 发帖可选 subtype 列表
 */
export function subtypeOptionsFor(postType: "feedback" | "courtyard"): SubtypeOption[] {
  return postType === "feedback" ? FEEDBACK_SUBTYPES : COURTYARD_SUBTYPES;
}
