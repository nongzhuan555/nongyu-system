/**
 * 二课业务查询模块
 */

import { secondFailResult } from "../utils/errors";
import { postQuery, unwrapEnvelope } from "../utils/request";
import type { SecondApiEnvelope, SecondResult } from "../utils/types";

async function callApi<T>(
  path: string,
  empty: T,
  params?: Record<string, string | number | undefined | null>,
): Promise<SecondResult<T>> {
  try {
    const envelope = await postQuery<SecondApiEnvelope<T>>(path, params);
    const parsed = unwrapEnvelope(envelope, empty);
    if (!parsed.ok) {
      return { success: false, result: parsed.data, message: parsed.message };
    }
    return { success: true, result: parsed.data, message: parsed.message };
  } catch (error: unknown) {
    return secondFailResult(empty, error);
  }
}

/**
 * 用户信息（首页档案摘要）
 */
export function getUserInfo() {
  return callApi<Record<string, unknown>>("/user/frontPage/v1.0.0/getUserInfo", {});
}

/**
 * 二课成绩单：综测、排名、学分分布等
 */
export function getReportCard() {
  return callApi<Record<string, unknown>>("/act/integrate/v1.0.0/myReportCard", {});
}

/**
 * 各育修分情况
 * @param hoursType 1 全部学年；2 本学年
 */
export function getActivityHoursDetail(hoursType: 1 | 2 = 1) {
  return callApi<unknown[]>("/act/credit/v1.0.0/getActivityHoursDetail", [], {
    hoursType,
  });
}

/**
 * 附加分记录
 */
export function getImportCreditDetail() {
  return callApi<unknown[]>("/act/credit/v1.0.0/getImportCreditDetail", []);
}

export type ListActivitiesParams = {
  /** 活动名关键词 */
  actName?: string;
  /** 页码，从 1 起 */
  page?: number;
  /** 1 即将开始 / 2 最新 / 4 可参与 */
  sortType?: 1 | 2 | 4;
  /** 部落 id */
  gid?: string;
  /** 分类 id */
  typeId?: string;
};

/**
 * 活动列表
 */
export function listActivities(params: ListActivitiesParams = {}) {
  return callApi<unknown[]>("/act/actInfo/v1.0.0/getUserSchoolActList", [], {
    actName: params.actName,
    page: params.page ?? 1,
    sortType: params.sortType,
    gid: params.gid,
    typeId: params.typeId,
  });
}

/**
 * 活动详情
 */
export function getActivityDetail(actId: string | number) {
  return callApi<Record<string, unknown>>(
    "/act/actInfo/v1.0.0/getActDetail",
    {},
    {
      actId,
    },
  );
}

/**
 * 学校活动分类树
 */
export function getSchoolActTypes() {
  return callApi<unknown[]>("/act/actType/v1.0.0/getSchoolActType", []);
}

/**
 * 部落列表
 */
export function getSchoolGroups() {
  return callApi<unknown[]>("/act/actconfig/v1.0.0/getSchoolGroup", []);
}

/**
 * 个人二课信息聚合（成绩单 + 修分 + 附加分），便于 App / Agent 一次取齐
 */
export async function getPersonalSecondInfo(hoursType: 1 | 2 = 1) {
  const [report, hours, extras] = await Promise.all([
    getReportCard(),
    getActivityHoursDetail(hoursType),
    getImportCreditDetail(),
  ]);

  if (!report.success && !hours.success && !extras.success) {
    return {
      success: false as const,
      result: {
        reportCard: report.result,
        hoursDetail: hours.result,
        importCredits: extras.result,
      },
      message: report.message || hours.message || extras.message || "获取个人二课信息失败",
    };
  }

  return {
    success: true as const,
    result: {
      reportCard: report.success ? report.result : null,
      hoursDetail: hours.success ? hours.result : null,
      importCredits: extras.success ? extras.result : null,
      partialErrors: {
        reportCard: report.success ? undefined : report.message,
        hoursDetail: hours.success ? undefined : hours.message,
        importCredits: extras.success ? undefined : extras.message,
      },
    },
  };
}
