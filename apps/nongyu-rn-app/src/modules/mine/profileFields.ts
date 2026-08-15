import type { SessionProfile } from "@/stores/session";

export type ProfileFieldDef = {
  key: keyof SessionProfile;
  label: string;
};

/** 我的页摘要网格：姓名 / 学号 / 学院 / 专业 / 班级 / 年级 */
export const PROFILE_SUMMARY_FIELDS: ProfileFieldDef[] = [
  { key: "name", label: "姓名" },
  { key: "studentId", label: "学号" },
  { key: "college", label: "学院" },
  { key: "major", label: "专业" },
  { key: "className", label: "班级" },
  { key: "grade", label: "年级" },
];

/** 个人信息详情（不含校区：教务侧拿不到稳定数据） */
export const PROFILE_DETAIL_FIELDS: ProfileFieldDef[] = [
  { key: "name", label: "姓名" },
  { key: "studentId", label: "学号" },
  { key: "gender", label: "性别" },
  { key: "college", label: "学院" },
  { key: "major", label: "专业" },
  { key: "grade", label: "年级" },
  { key: "className", label: "班级" },
  { key: "identity", label: "培养层次" },
  { key: "studentStatus", label: "学籍状态" },
  { key: "enrollmentDate", label: "入学日期" },
  { key: "ethnicity", label: "民族" },
  { key: "politicalStatus", label: "政治面貌" },
  { key: "phone", label: "个人电话" },
  { key: "examId", label: "考生号" },
  { key: "hometown", label: "家庭通讯地址" },
];

/**
 * 读取档案字段展示值
 */
export function profileFieldValue(profile: SessionProfile, key: keyof SessionProfile): string {
  const raw = profile[key];
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return "未知";
}
