/**
 * 学业进度业务模块
 */

import { extractProgressInfo } from '../extractor';
import { fetchJiaowuHtml } from '../utils';

/**
 * 教务网学业进度查询页面 URL
 */
const PROGRESS_INFO_URL = 'https://jiaowu.sicau.edu.cn/xuesheng/chengji/xdjd/xuefen_2023.asp?title_id1=1';

/**
 * 获取学生的学业修读进度（各模块学分统计）。
 * 
 * 使用场景：
 * 1. 农屿app内学业进度页面供学生查看自己的学业修读进度。
 * 2. nongyu-agent将此作为tool调用，用于获取当前用户的学业修读进度。
 * 
 * @returns 成功返回 `{ success: true, result: ProgressItem[] }`，失败返回 `{ success: false, result: [] }`
 * 
 * @example 基本调用
 * ```ts
 * const progress = await getProgressInfo();
 * ```
 * 
 * @example 成功示例
 * ```ts
 * const progress = await getProgressInfo();
 * // {
 * //   result: [
 * //     {
 * //       type: '必修\n（含专业基础与专业核心）',
 * //       required: '105',
 * //       earned: '90.5',
 * //       diff: '-14.5',
 * //       transfer: '0',
 * //       progress: '86.19%'
 * //     },
 * //     {
 * //       type: '通识选修',
 * //       required: '8',
 * //       earned: '13\n[其中 自然科学类:2]',
 * //       diff: '5',
 * //       transfer: '5',
 * //       progress: '162.5%'
 * //     },
 * //     {
 * //       type: '合 计',
 * //       required: '170',
 * //       earned: '129.5',
 * //       diff: '-40.5',
 * //       transfer: '/',
 * //       progress: '76.18%'
 * //     }
 * //   ],
 * //   success: true
 * // }
 * ```
 * 
 * @example 失败示例
 * ```ts
 * // 网络异常或未登录时
 * const progress = await getProgressInfo();
 * // {
 * //   result: [],
 * //   success: false
 * // }
 * ```
 */
export const getProgressInfo = async () => {
  try {
    const html = await fetchJiaowuHtml(PROGRESS_INFO_URL);
    return extractProgressInfo(html);
  } catch (error) {
    console.error('获取学业进度失败:', error);
    return {
      result: [],
      success: false,
    };
  }
}
