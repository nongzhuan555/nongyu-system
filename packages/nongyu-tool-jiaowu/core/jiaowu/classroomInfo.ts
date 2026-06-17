/**
 * 教室信息查询模块
 */

import { extractClassroomInfo } from '../extractor/classroomInfoExtractor';
import type { ClassroomInfo, ClassroomInfoResult } from '../extractor/classroomInfoExtractor';
import { fetchJiaowuHtml } from '../utils';

export type { ClassroomInfo, ClassroomInfoResult };

/**
 * 获取全部教室信息
 *
 * @param searchWord 搜索关键词（教室名称，支持模糊查询，不传说明查询所有教室）
 * @returns 教室列表
 *
 * @example
 * const info = await getClassroomInfo('10-A203');
 * if (info.success) {
 *   console.log(info.result?.length, info.result[0]?.location);
 * }
 */
export const getClassroomInfo = async (searchWord: string): Promise<ClassroomInfoResult> => {
  try {
    const CLASSROOM_INFO_URL =
  `https://jiaowu.sicau.edu.cn/web/web/js_kb_cha/jshi_new.asp?bj=${searchWord}`;
    const html = await fetchJiaowuHtml(CLASSROOM_INFO_URL);
    return extractClassroomInfo(html);
  } catch (error) {
    console.error('获取教室信息失败:', error);
    return { result: null, success: false };
  }
};
