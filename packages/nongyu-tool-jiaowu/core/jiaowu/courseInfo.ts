/**
 * 课表查询模块
 */

import { extractCourseInfo } from '../extractor';
import { fetchJiaowuHtml } from '../utils';

/**
 * 教务网班级课表查询页面 URL
 */
const COURSE_INFO_URL =
  'https://jiaowu.sicau.edu.cn/xuesheng/gongxuan/gongxuan/kbbanji.asp?title_id1=4';

/**
 * 获取学生本学期的课程安排。
 * 
 * 使用场景：
 * 1. 农屿app内课表页面供学生查看自己的课程安排。
 * 2. nongyu-agent将此作为tool调用，用于获取当前用户的课程安排，但实际使用场景中agent使用的课表工具优先从本地缓存中读取，兜底时再调用此tool。
 * 
 * @returns 成功返回 `{ success: true, result: CourseItem[] }`，失败返回 `{ success: false, result: [] }`
 * 
 * @example 基本调用
 * ```ts
 * const courses = await getCourseInfo();
 * ```
 * 
 * @example 成功示例
 * ```ts
 * const courses = await getCourseInfo();
 * // {
 * //   result: [
 * //     {
 * //       campus: '雅安',
 * //       courseName: 'Web设计与应用(Mooc)',
 * //       courseId: '300513911',
 * //       weeks: '1-16',
 * //       classroom: '',
 * //       scheduleTime: '自行在线学习',
 * //       credit: '2',
 * //       hours: '32',
 * //       weeklyHours: '0',
 * //       labHours: '0',
 * //       assessmentMethod: '其它',
 * //       teacher: '',
 * //       enrollmentType: '初修',
 * //       blendedTeaching: ''
 * //     },
 * //     {
 * //       campus: '雅安',
 * //       courseName: '传感器技术',
 * //       courseId: '300509303',
 * //       weeks: '1-14',
 * //       classroom: '10-A309\\n10-A309',
 * //       scheduleTime: '2-9,2-10(单)\\n4-5,4-6',
 * //       credit: '2.5',
 * //       hours: '40',
 * //       weeklyHours: '3',
 * //       labHours: '0',
 * //       assessmentMethod: '卷面考核',
 * //       teacher: '黄晖',
 * //       enrollmentType: '初修',
 * //       blendedTeaching: '1.网址：https://www.xuetangx.com/... 2.课表调整：将2-7周周四5-6节均调整为线上'
 * //     },
 * //     {
 * //       campus: '雅安',
 * //       courseName: '形势与政策Ⅵ',
 * //       courseId: '300512253',
 * //       weeks: '1-4',
 * //       classroom: '逸夫楼小礼堂',
 * //       scheduleTime: '3-1,3-2',
 * //       credit: '0.5',
 * //       hours: '8',
 * //       weeklyHours: '2',
 * //       labHours: '0',
 * //       assessmentMethod: '其它',
 * //       teacher: '廖鹏',
 * //       enrollmentType: '初修',
 * //       blendedTeaching: ''
 * //     }
 * //   ],
 * //   success: true
 * // }
 * ```
 * 
 * @example 失败示例
 * ```ts
 * // 网络异常或未登录时
 * const courses = await getCourseInfo();
 * // {
 * //   result: [],
 * //   success: false
 * // }
 * ```
 */
export const getCourseInfo = async () => {
  try {
    const html = await fetchJiaowuHtml(COURSE_INFO_URL);
    return extractCourseInfo(html);
  } catch (error) {
    console.error('获取课表信息失败:', error);
    return {
      result: [],
      success: false,
    };
  }
};
