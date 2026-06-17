/**
 * 教室课程信息查询模块
 * 查询指定教室在某学期的课程安排
 */

import { extractClassroomCourseInfo } from '../extractor/classroomCourseInfoExtractor';
import type {
  ClassroomCourseItem,
  ClassroomCourseSlot,
  ClassroomCourseResult,
  ClassroomCourseInfoResult,
} from '../extractor/classroomCourseInfoExtractor';
import { fetchJiaowuHtml } from '../utils';
import { getClassroomInfo } from './classroomInfo';

/**
 * 教务网教室课表详情页基础 URL
 * bianhao 参数从教室列表页获取
 */
const CLASSROOM_COURSE_BASE_URL =
  'https://jiaowu.sicau.edu.cn/web/web/js_kb_cha/kbjshi_new.asp';

/**
 * 教务网教室搜索页 URL（用作课表详情页请求的 Referer，避免反爬）
 */
const CLASSROOM_SEARCH_URL =
  'https://jiaowu.sicau.edu.cn/web/web/js_kb_cha/jshi_new.asp';

export type {
  ClassroomCourseItem,
  ClassroomCourseSlot,
  ClassroomCourseResult,
  ClassroomCourseInfoResult,
};

/**
 * 获取指定教室的课程安排
 *
 * @param classroomId 教室编号（bianhao），从 getClassroomInfo 返回的 classroomId 获取
 * @param referer Referer 请求头（用于反爬），默认使用教室搜索页 URL
 * @returns 教室课程信息
 *
 * @example
 * const info = await getClassroomCourseInfo('88797794895029568950437697416759');
 * if (info.success) {
 *   console.log(info.result?.classroomName, info.result?.slots.length);
 * }
 */
export const getClassroomCourseInfo = async (
  classroomId: string,
  referer?: string,
): Promise<ClassroomCourseInfoResult> => {
  try {
    const url = `${CLASSROOM_COURSE_BASE_URL}?bianhao=${classroomId}`;
    const html = await fetchJiaowuHtml(url, {
      Referer: referer || CLASSROOM_SEARCH_URL,
    });
    return extractClassroomCourseInfo(html);
  } catch (error) {
    console.error('获取教室课程信息失败:', error);
    return { result: null, success: false };
  }
};

/**
 * 根据教室名称搜索并获取课表。
 * 
 * 流程：
 * 1. 调用 getClassroomInfo 搜索教室列表
 * 2. 按教室名称精确匹配，获取 classroomId
 * 3. 调用 getClassroomCourseInfo 获取课表详情
 * 
 * 使用场景：
 * 1. 暂不考虑用于农屿app专门页面展示，只用于给agent做tool用于查看特定教室课表
 * 
 * @param name - 教室名称（如：10-A104）
 * @returns 成功返回 `{ success: true, result: { classroomName, semester, slots } }`，失败返回 `{ success: false, result: null }`
 * 
 * @example 基本调用
 * ```ts
 * const info = await getClassroomCourseInfoByName('10-A104');
 * ```
 * 
 * @example 成功示例
 * ```ts
 * const info = await getClassroomCourseInfoByName('10-A104');
 * // {
 * //   result: {
 * //     classroomName: '10-A104',
 * //     semester: '2025-2026-2',
 * //     slots: [
 * //       {
 * //         dayOfWeek: 1,
 * //         period: '上午',
 * //         slot: '34节',
 * //         courses: [
 * //           {
 * //             courseName: '射频识别原理与应用',
 * //             teacher: '王乾丰',
 * //             weekRange: '1-12',
 * //             studentCount: '62',
 * //             courseType: '必修',
 * //             weekPattern: ''
 * //           }
 * //         ]
 * //       },
 * //       {
 * //         dayOfWeek: 3,
 * //         period: '上午',
 * //         slot: '56节',
 * //         courses: [
 * //           {
 * //             courseName: '射频识别原理与应用',
 * //             teacher: '王乾丰',
 * //             weekRange: '1-12',
 * //             studentCount: '62',
 * //             courseType: '必修',
 * //             weekPattern: '单'
 * //           }
 * //         ]
 * //       }
 * //     ]
 * //   },
 * //   success: true
 * // }
 * ```
 * 
 * @example 失败示例
 * ```ts
 * // 未找到该教室或网络异常时
 * const info = await getClassroomCourseInfoByName('不存在的教室');
 * // {
 * //   result: null,
 * //   success: false
 * // }
 * ```
 */
export const getClassroomCourseInfoByName = async (
  name: string
): Promise<ClassroomCourseInfoResult> => {
  try {
    // 1. 搜索教室
    const searchResult = await getClassroomInfo(name);

    // 2. 按教室名称精确匹配
    const match = searchResult.result?.find(
      (item) => item.location === name
    );
    if (!match) {
      console.error(`未找到教室: ${name}`);
      return { result: null, success: false };
    }

    // 3. 获取课表详情（传入教室搜索页作为 Referer）
    const referer = `${CLASSROOM_SEARCH_URL}?bj=${encodeURIComponent(name)}&shou1=`;
    return getClassroomCourseInfo(match.classroomId, referer);
  } catch (error) {
    console.error('获取教室课程信息失败:', error);
    return { result: null, success: false };
  }
};
