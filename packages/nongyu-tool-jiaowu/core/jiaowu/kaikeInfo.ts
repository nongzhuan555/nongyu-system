/**
 * 开课目录查询模块
 * 从教务开课计划页面获取当前学期的课程汇总开课目录
 */

import { extractKaikeInfo } from '../extractor/kaikeInfoExtractor';
import type { KaikeItem, KaikeResult, KaikeInfoResult } from '../extractor/kaikeInfoExtractor';
import { fetchJiaowuHtml } from '../utils';

export type { KaikeItem, KaikeResult, KaikeInfoResult };

/**
 * 开课目录页 URL
 */
const KAIKE_URL = 'https://jiaowu.sicau.edu.cn/xuesheng/gongxuan/gongxuan/kai.asp';

/**
 * 开课信息查询参数
 */
const KAIKE_PARAMS = {
  "y":1, // 页码
  "ww_f":"", // 教师名字
}


/**
 * 获取开课目录
 *
 * 从教务开课计划页抓取当前学期的课程汇总开课目录，
 * 包含每门课的编号、名称、教师、学时、人数等详细信息。
 *
 * @returns 包含学期和课程列表的 Promise，符合 { result, success } 结构
 *
 * @example
 * const info = await getKaikeInfo();
 * if (info.success) {
 *   console.log(`学期: ${info.result.semester}, 课程数: ${info.result.courses.length}`);
 *   info.result.courses.slice(0, 3).forEach(c => {
 *     console.log(`${c.courseName} | ${c.teacher} | ${c.classroom}`);
 *   });
 * }
 */
export const getKaikeInfo = async (): Promise<KaikeInfoResult> => {
  try {
    const html = await fetchJiaowuHtml(KAIKE_URL);
    return extractKaikeInfo(html);
  } catch (error) {
    console.error('获取开课目录失败:', error);
    return { result: null, success: false };
  }
};
