/**
 * 教务通知业务模块
 */

import { extractTeachingNotices } from '../extractor';
import { extractCompetitionInfo } from '../extractor/competitionInfoExtractor';
import { fetchJiaowuHtml } from '../utils';

/**
 * 教务网通知公告页面 URL
 */
const NOTICE_URL = 'https://jiaowu.sicau.edu.cn/web/web/web/index.asp';

/**
 * 获取教务网最新通知信息（含教学通知与竞赛通知合并列表）。
 * 
 * 使用场景：
 * 1. 农屿App教务通知页面以此获取教务网首页通知数据渲染成列表，点击列表可跳转教务通知详情页
 * 2. nongyu-agent将此作为tool调用用于获取教务网首页通知数据，用以回答用户提出的与教务网通知相关的问题
 * 
 * @returns 成功返回 `{ success: true, result: NoticeItem[] }`，失败返回 `{ success: false, result: [] }`
 * 
 * @example 基本调用
 * ```ts
 * const noticeResult = await getNoticeInfo();
 * ```
 * 
 * @example 成功示例
 * ```ts
 * const noticeResult = await getNoticeInfo();
 * // {
 * //   result: [
 * //     {
 * //       title: '无法显示新闻图片',
 * //       url: 'https://jiaowu.sicau.edu.cn/web/web/web/#',
 * //       date: '06-16'
 * //     },
 * //     {
 * //       title: '我校2026年上半年全国大学英语四、六级 及英语专业四级考试顺利举行',
 * //       url: 'https://jwnews.sicau.edu.cn/jwnews/view.asp?id=1396',
 * //       date: '06-15'
 * //     },
 * //     {
 * //       title: '行走的课堂：《茶叶生产经营实践》打造产教融合特色课',
 * //       url: 'https://jwnews.sicau.edu.cn/jwnews/view.asp?id=1395',
 * //       date: '06-12'
 * //     }
 * //   ],
 * //   success: true
 * // }
 * ```
 * 
 * @example 失败示例
 * ```ts
 * // 网络异常或未登录时
 * const noticeResult = await getNoticeInfo();
 * // {
 * //   result: [],
 * //   success: false
 * // }
 * ```
 */
export const getNoticeInfo = async () => {
  try {
    const html = await fetchJiaowuHtml(NOTICE_URL);
    const teachingResult = extractTeachingNotices(html);
    const competitionResult = extractCompetitionInfo(html);

    // 合并两个通知列表
    const allNotices = [
      ...teachingResult.result,
      ...competitionResult.result,
    ];

    return {
      result: allNotices,
      success: teachingResult.success || competitionResult.success,
    };
  } catch (error) {
    console.error('获取教务通知失败:', error);
    return {
      result: [],
      success: false,
    };
  }
}
