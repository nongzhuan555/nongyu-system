/**
 * 教师课表查询模块
 */

import { extractTeacherCourseInfo, extractTeacherSearchResults } from '../extractor/teacherCourseInfoExtractor';
import type {
  TeacherCourseItem,
  TeacherCourseSlot,
  TeacherCourseResult,
  TeacherCourseInfoResult,
  TeacherSearchItem,
} from '../extractor/teacherCourseInfoExtractor';
import { fetchJiaowuHtml, encodeGbkUrl } from '../utils';

/**
 * 教师姓名搜索 URL
 */
const TEACHER_SEARCH_URL =
  'https://jiaowu.sicau.edu.cn/web/web/lanmu/jiaoshi_new.asp';

/**
 * 教师课表详情 URL
 */
const TEACHER_COURSE_URL =
  'https://jiaowu.sicau.edu.cn/web/web/lanmu/jiaoshikb_new.asp';

export type {
  TeacherCourseItem,
  TeacherCourseSlot,
  TeacherCourseResult,
  TeacherCourseInfoResult,
  TeacherSearchItem,
};

/**
 * 根据教师姓名搜索并获取课表。
 * 
 * 流程：
 * 1. 将教师名编码为 GBK URL 格式
 * 2. 请求搜索列表页，提取搜索结果
 * 3. 按姓名精确匹配，获取 bianhao
 * 4. 请求教师课表详情页，返回清洗结果
 * 
 * 使用场景：
 * 1. 暂不考虑农屿app专门做个页面使用此功能,只是nongyu-agent将此作为tool调用，用于获取当前用户的课表。
 * 
 * 
 * @param name - 教师姓名（中文）
 * @returns 成功返回 `{ success: true, result: { teacherName, semester, slots } }`，失败返回 `{ success: false, result: null }`
 * 
 * @example 基本调用
 * ```ts
 * const info = await getTeacherCourseInfoByName('张洁');
 * ```
 * 
 * @example 成功示例
 * ```ts
 * const info = await getTeacherCourseInfoByName('张洁');
 * // {
 * //   result: {
 * //     teacherName: '张洁',
 * //     semester: '2025-2026-2',
 * //     slots: [
 * //       {
 * //         dayOfWeek: 3,
 * //         period: '上午',
 * //         slot: '12节',
 * //         courses: [
 * //           {
 * //             courseName: '数据结构实验',
 * //             courseType: '必修',
 * //             classId: '4152024_1',
 * //             location: '雅安校区：10-B302室',
 * //             weekRange: '3-14',
 * //             weekPattern: '',
 * //             isExperiment: true,
 * //             isContinuous: false,
 * //             hoursUnit: '2学时'
 * //           }
 * //         ]
 * //       },
 * //       {
 * //         dayOfWeek: 2,
 * //         period: '晚上',
 * //         slot: '910节',
 * //         courses: [
 * //           {
 * //             courseName: '数据结构41520240701020202',
 * //             courseType: '',
 * //             classId: '',
 * //             location: '雅安校区：10-A607室',
 * //             weekRange: '1-14',
 * //             weekPattern: '单',
 * //             isExperiment: false,
 * //             isContinuous: false,
 * //             hoursUnit: '2学时'
 * //           },
 * //           {
 * //             courseName: '数据结构41520240701020201',
 * //             courseType: '',
 * //             classId: '',
 * //             location: '雅安校区：10-A708室',
 * //             weekRange: '1-14',
 * //             weekPattern: '双',
 * //             isExperiment: false,
 * //             isContinuous: false,
 * //             hoursUnit: '2学时'
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
 * // 未找到该教师或网络异常时
 * const info = await getTeacherCourseInfoByName('不存在的教师');
 * // {
 * //   result: null,
 * //   success: false
 * // }
 * ```
 */
export const getTeacherCourseInfoByName = async (
  name: string
): Promise<TeacherCourseInfoResult> => {
  try {
    // 1. 搜索教师
    const encodedName = encodeGbkUrl(name);
    const searchHtml = await fetchJiaowuHtml(
      `${TEACHER_SEARCH_URL}?xm=${encodedName}&shou1=`
    );
    const searchResult = extractTeacherSearchResults(searchHtml);

    // 2. 按姓名精确匹配
    const match = searchResult.result?.find(
      (item) => item.name === name
    );
    if (!match) {
      console.error(`未找到教师: ${name}`);
      return { result: null, success: false };
    }

    // 3. 获取课表详情
    const url = `${TEACHER_COURSE_URL}?bianhao=${match.bianhao}`;
    const html = await fetchJiaowuHtml(url);
    return extractTeacherCourseInfo(html);
  } catch (error) {
    console.error('获取教师课表失败:', error);
    return { result: null, success: false };
  }
};

