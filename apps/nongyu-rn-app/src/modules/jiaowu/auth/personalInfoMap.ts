import type { SessionProfile } from "@/stores/session";

/** 教务个人信息可映射字段（与 tool-jiaowu PersonalInfo 对齐） */
export type JiaowuPersonalInfoLike = {
  name?: string;
  studentId?: string;
  gender?: string;
  college?: string;
  major?: string;
  grade?: string;
  className?: string;
  identity?: string;
  studentStatus?: string;
  enrollmentDate?: string;
  ethnicity?: string;
  politicalStatus?: string;
  phone?: string;
  examId?: string;
  homeAddress?: string;
  campus?: string;
};

/**
 * 教务 PersonalInfo → 会话档案
 */
export function personalInfoToSessionProfile(
  info: JiaowuPersonalInfoLike,
  fallbackStudentId: string,
): SessionProfile {
  return {
    studentId: info.studentId?.trim() || fallbackStudentId,
    name: info.name?.trim() || "",
    college: info.college,
    major: info.major,
    grade: info.grade,
    className: info.className,
    gender: info.gender,
    campus: info.campus,
    hometown: info.homeAddress,
    identity: info.identity,
    studentStatus: info.studentStatus,
    enrollmentDate: info.enrollmentDate,
    ethnicity: info.ethnicity,
    politicalStatus: info.politicalStatus,
    phone: info.phone,
    examId: info.examId,
  };
}
