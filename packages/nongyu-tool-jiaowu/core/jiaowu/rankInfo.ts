/**
 * 排名查询业务模块
 */

import { extractRankInfo } from '../extractor';
import { fetchJiaowuHtml } from '../utils';

/**
 * 教务网排名查询页面 URL
 */
const RANK_INFO_URL = 'https://jiaowu.sicau.edu.cn/xuesheng/chengji/chengji/zytongbf.asp';

/**
 * 获取学生的加权平均成绩及专业排名。
 * 
 * 使用场景：
 * 1. 农屿app内排名页面供学生查看自己的加权平均成绩及专业排名。
 * 2. nongyu-agent将此作为tool调用，用于获取当前用户的加权平均成绩及专业排名。
 * 
 * @returns 成功返回 `{ success: true, result: RankItem }`，失败返回 `{ success: false, result: null }`
 * 
 * @example 基本调用
 * ```ts
 * const rankResult = await getRankInfo();
 * ```
 * 
 * @example 成功示例
 * ```ts
 * const rankResult = await getRankInfo();
 * // {
 * //   result: {
 * //     index: '1',
 * //     campus: '雅安',
 * //     college: '信息工程学院',
 * //     major: '物联网工程',
 * //     grade: '2023',
 * //     studentId: '202308596',
 * //     name: '唐磊',
 * //     className: '物联网202301',
 * //     weightedScore: '81.71',
 * //     majorRank: '114',
 * //     status: '在读'
 * //   },
 * //   success: true
 * // }
 * ```
 * 
 * @example 失败示例
 * ```ts
 * // 网络异常或未登录时
 * const rankResult = await getRankInfo();
 * // {
 * //   result: null,
 * //   success: false
 * // }
 * ```
 */
export const getRankInfo = async () => {
  try {
    const html = await fetchJiaowuHtml(RANK_INFO_URL);
    return extractRankInfo(html);
  } catch (error) {
    console.error('获取排名信息失败:', error);
    return {
      result: null,
      success: false,
    };
  }
}
