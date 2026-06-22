/**
 * 农屿教务系统工具集 — Agent Tool 封装
 *
 * 将 nongyu-tool-jiaowu 中的核心业务函数封装为符合 Agent SDK 规范的 Tool，
 * 供 createAgent() 直接使用。
 */

import { z } from 'zod';
import { tool } from '../index';
import {
  // jiaowuLogin, 教务登录不封装成Agent用的tool
  // setLoginData, 同理,也不由Agent直接使用
  getNoticeInfo,
  getCompetitionInfo,
  getPersonalInfo,
  getScoreInfo,
  getExamInfo,
  getProgressInfo,
  getPlanInfo,
  getRankInfo,
  getCourseInfo,
  getClassroomCourseInfoByName,
  getTeacherCourseInfoByName,
} from 'nongyu-tool-jiaowu';

// ===== 无需鉴权的工具 =====

export const noticeInfoTool = tool({
  name: 'jiaowu_notice_info',
  description: '获取四川农业大学教务网首页的最新通知公告。当用户要求查询四川农业大学相关通知时优先使用，而非通过互联网搜索。该工具返回通知的标题日期和详情链接,若需进一步了解详情内容则需提取出目标通知的链接然后使用WebFetch相关工具获取详情内容。',
  inputSchema: z.object({}),
  async execute() {
    const res = await getNoticeInfo();
    return JSON.stringify(res);
  },
});

export const competitionInfoTool = tool({
  name: 'jiaowu_competition_info',
  description: '获取四川农业大学教务网首页的最新竞赛公告。当用户要求查询四川农业大学相关竞赛公告时优先使用，而非通过互联网搜索。该工具返回通知的标题日期和详情链接,若需进一步了解详情内容则需提取出目标通知的链接然后使用WebFetch相关工具获取详情内容。',
  inputSchema: z.object({}),
  async execute() {
    const res = await getCompetitionInfo();
    return JSON.stringify(res);
  },
});

export const classroomCourseTool = tool({
  name: 'jiaowu_classroom_course',
  description: '根据给定的教室名称查询该教室的课表安排（如 4-A107）。当用户询问某教室的课表安排或者想知道某教室什么时候有课什么时候无课等类似的场景和问题时，该工具可以用于获取指定教室的详细课表安排以更好的回复用户问题。',
  inputSchema: z.object({
    name: z.string().describe('教室名称，如 4-A107'),
  }),
  async execute({ name }) {
    const res = await getClassroomCourseInfoByName(name);
    return JSON.stringify(res);
  },
});

export const teacherCourseTool = tool({
  name: 'jiaowu_teacher_course',
  description: '根据给定的教师名称查询该教师的课表安排（如 蒲海波）。当用户询问某教师的课表安排或者想知道某教师什么时候有课什么时候无课等类似的场景和问题时，该工具可以用于获取指定教师的详细课表安排以更好的回复用户问题。',
  inputSchema: z.object({
    name: z.string().describe('教师名称，如 蒲海波'),
  }),
  async execute({ name }) {
    const res = await getTeacherCourseInfoByName(name);
    return JSON.stringify(res);
  },
});

// ===== 需鉴权的工具,进入农屿后自动全局登录一次,方便以下工具的使用 =====

export const personalInfoTool = tool({
  name: 'jiaowu_personal_info',
  description: '获取当前登录学生的个人信息（姓名、学号、专业、班级等）。当用户想要查询个人信息或者大模型通过对话意识到需要了解用户个人信息时调用。',
  inputSchema: z.object({}),
  async execute() {
    const res = await getPersonalInfo();
    return JSON.stringify(res);
  },
});

export const scoreInfoTool = tool({
  name: 'jiaowu_score_info',
  description: '获取当前登录学生的所有课程成绩，包括课程名称、学分、成绩等。当用户想要查询成绩或者大模型通过对话意识到需要了解用户成绩时调用。',
  inputSchema: z.object({}),
  async execute() {
    const res = await getScoreInfo();
    return JSON.stringify(res);
  },
});

export const examInfoTool = tool({
  name: 'jiaowu_exam_info',
  description: '获取当前登录学生的考试安排，包括考试科目、考试时间、考试时间、地点、座位号等。当用户想要查询考试安排或者大模型通过对话意识到需要了解用户考试安排时调用。',
  inputSchema: z.object({}),
  async execute() {
    const res = await getExamInfo();
    return JSON.stringify(res);
  },
});

// 课表工具后续需要改动,优先读本地缓存,使用接口兜底
export const courseInfoTool = tool({
  name: 'jiaowu_course_info',
  description: '获取当前登录学生本学期的课表（课程名称、上课时间、地点、教师等）。当用户想要查询课表或者大模型通过对话意识到需要了解用户课表时调用。',
  inputSchema: z.object({}),
  async execute() {
    const res = await getCourseInfo();
    return JSON.stringify(res);
  },
});

export const progressInfoTool = tool({
  name: 'jiaowu_progress_info',
  description: '获取当前登录学生的学业修读进度（各模块学分完成情况）。当用户想要查询学业进度或者大模型通过对话意识到需要了解用户学业进度时调用。',
  inputSchema: z.object({}),
  async execute() {
    const res = await getProgressInfo();
    return JSON.stringify(res);
  },
});

export const planInfoTool = tool({
  name: 'jiaowu_plan_info',
  description: '获取当前登录学生的专业培养方案。当用户想要查询培养方案或者大模型通过对话意识到需要了解用户培养方案时调用。',
  inputSchema: z.object({}),
  async execute() {
    const res = await getPlanInfo();
    return JSON.stringify(res);
  },
});

export const rankInfoTool = tool({
  name: 'jiaowu_rank_info',
  description: '获取当前登录学生的加权平均成绩及专业排名。当用户想要查询排名或者大模型通过对话意识到需要了解用户排名时调用。',
  inputSchema: z.object({}),
  async execute() {
    const res = await getRankInfo();
    return JSON.stringify(res);
  },
});

// ===== 教务工具集统一导出 =====

export const jiaowuTools = {
  jiaowu_notice_info: noticeInfoTool,
  jiaowu_competition_info: competitionInfoTool,
  jiaowu_classroom_course: classroomCourseTool,
  jiaowu_teacher_course: teacherCourseTool,
  jiaowu_personal_info: personalInfoTool,
  jiaowu_score_info: scoreInfoTool,
  jiaowu_exam_info: examInfoTool,
  jiaowu_course_info: courseInfoTool,
  jiaowu_progress_info: progressInfoTool,
  jiaowu_plan_info: planInfoTool,
  jiaowu_rank_info: rankInfoTool,
};
