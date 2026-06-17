/**
 * 成绩查询业务模块
 */

import { extractScoreInfo } from '../extractor';
import { fetchJiaowuHtml } from '../utils';

/**
 * 教务网成绩查询页面 URL
 */
const SCORE_INFO_URL = 'https://jiaowu.sicau.edu.cn/xuesheng/chengji/chengji/sear_ch_all.asp';

/**
 * 获取学生的所有课程成绩。
 * 
 * 从教务网成绩查询页面抓取 HTML，定位并解析所有课程成绩数据。
 * 
 * 使用场景：
 * 1. 农屿App成绩查询页面以此获取教务网成绩查询数据渲染成列表
 * 2. nongyu-agent将此作为tool调用用于获取教务网成绩查询数据，用以回答用户个人课程成绩相关问题
 * 
 * @returns 成功返回 `{ success: true, result: ScoreItem[] }`，失败返回 `{ success: false, result: [] }`
 * 
 * @example 基本调用
 * ```ts
 * const scores = await getScoreInfo();
 * ```
 * 
 * @example 成功示例
 * ```ts
 * const scores = await getScoreInfo();
 * // {
 * //   result: [
 * //     {
 * //       courseName: '形势与政策Ⅰ',
 * //       score: '90',
 * //       credit: '0.5',
 * //       gradePoint: '4',
 * //       term: '2023-2024-1',
 * //       courseType: '必修',
 * //       source: '初修',
 * //       note: ''
 * //     },
 * //     {
 * //       courseName: '大学生心理健康与职业发展Ⅱ（心理健康教育）',
 * //       score: '93',
 * //       credit: '0.5',
 * //       gradePoint: '4.3',
 * //       term: '2023-2024-1',
 * //       courseType: '必修',
 * //       source: '初修',
 * //       note: ''
 * //     }
 * //   ],
 * //   success: true
 * // }
 * ```
 * 
 * @example 失败示例
 * ```ts
 * // 网络异常或未登录时
 * const scores = await getScoreInfo();
 * // {
 * //   result: [],
 * //   success: false
 * // }
 * ```
 */
export const getScoreInfo = async () => {
  try {
    const html = await fetchJiaowuHtml(SCORE_INFO_URL);
    return extractScoreInfo(html);
  } catch (error) {
    console.error('获取成绩信息失败:', error);
    return {
      result: [],
      success: false,
    };
  }
}
