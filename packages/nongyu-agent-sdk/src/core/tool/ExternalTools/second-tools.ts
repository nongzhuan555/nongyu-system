/**
 * 农屿二课系统工具集 — Agent Tool 封装
 *
 * 将 nongyu-tool-second 核心业务函数封装为符合 Agent SDK 规范的 Tool。
 * 登录 / setLoginData 不封装（由 App 会话保证）。
 * 报名写操作不封装（见接口清单文档，后续版本可能启用）。
 */

import { z } from "zod";
import { tool } from "../index";
import {
  getUserInfo,
  getReportCard,
  getActivityHoursDetail,
  getImportCreditDetail,
  getPersonalSecondInfo,
  listActivities,
  getActivityDetail,
  getSchoolActTypes,
  getSchoolGroups,
  getLoginData,
} from "nongyu-tool-second";

export const secondUserInfoTool = tool({
  name: "second_user_info",
  description:
    "获取当前登录学生在二课（i川农）的用户资料摘要。当需要了解用户二课侧基本身份信息时调用。",
  inputSchema: z.object({}),
  async execute() {
    return JSON.stringify(await getUserInfo());
  },
});

export const secondReportCardTool = tool({
  name: "second_report_card",
  description:
    "获取当前学生的二课成绩单，含综测得分、班级/专业/年级/全校排名、各育学分分布等。当用户询问二课成绩、综测或排名时优先使用。",
  inputSchema: z.object({}),
  async execute() {
    return JSON.stringify(await getReportCard());
  },
});

export const secondHoursDetailTool = tool({
  name: "second_hours_detail",
  description:
    "获取二课各育（德育/智育/美育/体育/劳育等）修分学时情况。hoursType=1 全部学年，=2 本学年。",
  inputSchema: z.object({
    hoursType: z
      .union([z.literal(1), z.literal(2)])
      .optional()
      .describe("1 全部学年（默认），2 本学年"),
  }),
  async execute({ hoursType }) {
    return JSON.stringify(await getActivityHoursDetail(hoursType ?? 1));
  },
});

export const secondImportCreditsTool = tool({
  name: "second_import_credits",
  description: "获取当前学生的二课附加分记录列表（竞赛获奖、四级等导入项）。",
  inputSchema: z.object({}),
  async execute() {
    return JSON.stringify(await getImportCreditDetail());
  },
});

export const secondPersonalInfoTool = tool({
  name: "second_personal_info",
  description:
    "一次获取个人二课综合信息（成绩单 + 修分情况 + 附加分）。推荐活动或分析毕业缺口前优先调用。",
  inputSchema: z.object({
    hoursType: z
      .union([z.literal(1), z.literal(2)])
      .optional()
      .describe("修分查询范围：1 全部学年（默认），2 本学年"),
  }),
  async execute({ hoursType }) {
    return JSON.stringify(await getPersonalSecondInfo(hoursType ?? 1));
  },
});

/**
 * 检查是否已保存二课登录凭据（用于自动重登）。
 */
function isSecondLoggedIn(): boolean {
  const { user, pwd } = getLoginData();
  return Boolean(user && pwd);
}

/**
 * 二课未登录时返回的统一结果，前端卡片据此引导用户跳转登录页。
 */
function secondAuthRequiredResult(): {
  success: false;
  needsAuth: true;
  result: unknown[];
  message: string;
} {
  return {
    success: false,
    needsAuth: true,
    result: [],
    message: "未登录二课系统，请先登录后查询活动",
  };
}

export const secondActivityListTool = tool({
  name: "second_activity_list",
  description:
    "查询二课活动列表，支持关键词、部落 gid、分类 typeId、排序与分页。推荐或检索活动时使用；分类/部落 id 可先调 second_act_types / second_groups。结果将以活动卡片形式展示给用户；若用户未登录二课，卡片会提示前往登录。",
  inputSchema: z.object({
    actName: z.string().optional().describe("活动名称关键词"),
    page: z.number().int().positive().optional().describe("页码，从 1 开始"),
    sortType: z
      .union([z.literal(1), z.literal(2), z.literal(4)])
      .optional()
      .describe("1 即将开始，2 最新，4 可参与"),
    gid: z.string().optional().describe("部落 id"),
    typeId: z.string().optional().describe("活动分类 id"),
  }),
  render: { component: "SecondActivityListCard" },
  async execute(input): Promise<unknown> {
    if (!isSecondLoggedIn()) {
      return secondAuthRequiredResult();
    }
    return await listActivities(input);
  },
});

export const secondActivityDetailTool = tool({
  name: "second_activity_detail",
  description: "按活动 id 获取二课活动详情与简介（时间、地点、赋分、状态等）。",
  inputSchema: z.object({
    actId: z.union([z.string(), z.number()]).describe("活动 id"),
  }),
  async execute({ actId }) {
    return JSON.stringify(await getActivityDetail(actId));
  },
});

export const secondActTypesTool = tool({
  name: "second_act_types",
  description: "获取学校二课活动分类树（德育/智育等），用于筛选活动列表的 typeId。",
  inputSchema: z.object({}),
  async execute() {
    return JSON.stringify(await getSchoolActTypes());
  },
});

export const secondGroupsTool = tool({
  name: "second_groups",
  description: "获取二课部落（学院/部门等）列表，用于筛选活动列表的 gid。",
  inputSchema: z.object({}),
  async execute() {
    return JSON.stringify(await getSchoolGroups());
  },
});

/** 二课工具集统一导出 */
export const secondTools = {
  second_user_info: secondUserInfoTool,
  second_report_card: secondReportCardTool,
  second_hours_detail: secondHoursDetailTool,
  second_import_credits: secondImportCreditsTool,
  second_personal_info: secondPersonalInfoTool,
  second_activity_list: secondActivityListTool,
  second_activity_detail: secondActivityDetailTool,
  second_act_types: secondActTypesTool,
  second_groups: secondGroupsTool,
};
