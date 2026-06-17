/**
 * 考试安排业务模块
 */

import { extractExamInfo } from '../extractor';
import { fetchJiaowuHtml } from '../utils';

/**
 * 教务网考试安排查询页面 URL
 */
const EXAM_INFO_URL = 'https://jiaowu.sicau.edu.cn/xuesheng/kao/kao/xuesheng.asp?title_id1=01';

/**
 * 获取学生的考试安排记录。
 * 
 * 从教务网考试安排查询页面抓取 HTML，定位并解析所有考试安排数据。
 * 
 * 使用场景：
 * 1. 农屿App考试安排页面以此获取教务网考试安排数据渲染成列表，同时也渲染在课表视图的最后一周
 * 2. nongyu-agent将此作为tool调用用于获取教务网考试安排数据，用以回答用户个人考试安排相关问题，此工具只在临近期末前有效，且此工具被用户调用的频率预计较低
 * 
 * @returns 成功返回 `{ success: true, result: ExamItem[] }`，失败返回 `{ success: false, result: [] }`
 * 
 * @example 基本调用
 * ```ts
 * const exams = await getExamInfo();
 * ```
 * 
 * @example 成功示例
 * ```ts
 * const exams = await getExamInfo();
 * // {
 * //   result: [
 * //     {
 * //       courseName: '传感器技术',
 * //       examTime: '【考试时间：2026-7-2】 第18周-星期4-上午(09:00—11:00)   请08:45到考场',
 * //       examRoom: '雅安校区:10-A303',
 * //       seatNumber: '17',
 * //       assessmentMethod: '卷面考核'
 * //     },
 * //     {
 * //       courseName: '嵌入式系统开发与应用',
 * //       examTime: '【考试时间：2026-7-2】 第18周-星期4-下午(15:00—17:00)   请14:45到考场',
 * //       examRoom: '雅安校区:10-A101',
 * //       seatNumber: '17',
 * //       assessmentMethod: '卷面考核'
 * //     },
 * //     {
 * //       courseName: '机器学习',
 * //       examTime: '【考试时间：2026-7-6】 第19周-星期1-晚上(19:00—21:00)   请18:45到考场',
 * //       examRoom: '雅安校区:10-B203',
 * //       seatNumber: '95',
 * //       assessmentMethod: '卷面考核'
 * //     }
 * //   ],
 * //   success: true
 * // }
 * ```
 * 
 * @example 失败示例
 * ```ts
 * // 网络异常或未登录时
 * const exams = await getExamInfo();
 * // {
 * //   result: [],
 * //   success: false
 * // }
 * ```
 */
export const getExamInfo = async () => {
  try {
    const html = await fetchJiaowuHtml(EXAM_INFO_URL);
    return extractExamInfo(html);
  } catch (error) {
    console.error('获取考试安排失败:', error);
    return {
      result: [],
      success: false,
    };
  }
}
