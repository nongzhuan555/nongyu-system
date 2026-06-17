/**
 * 竞赛通知查询模块
 * 从教务首页获取竞赛通知列表
 */

import { extractCompetitionInfo } from '../extractor/competitionInfoExtractor';
import type { NoticeItem, NoticeResult } from '../extractor/competitionInfoExtractor';
import { fetchJiaowuHtml } from '../utils';

export type { NoticeItem, NoticeResult };

/**
 * 教务网首页 URL（竞赛通知嵌在此页中）
 */
const INDEX_URL = 'https://jiaowu.sicau.edu.cn/web/web/web/index.asp';

/**
 * 获取教务网竞赛通知列表。
 * 
 * 从教务首页抓取 HTML，定位并解析竞赛通知区域内的所有条目。
 * 
 * 使用场景：
 * 1. 农屿App教务通知页面以此获取教务网首页竞赛通知数据渲染成列表，点击列表可跳转教务网竞赛通知详情页
 * 2. nongyu-agent将此作为tool调用用于获取教务网首页竞赛通知数据，用以回答用户提出的与教务网竞赛通知相关的问题
 * 
 * @returns 成功返回 `{ success: true, result: NoticeItem[] }`，失败返回 `{ success: false, result: [] }`
 * 
 * @example 基本调用
 * ```ts
 * const info = await getCompetitionInfo();
 * ```
 * 
 * @example 成功示例
 * ```ts
 * const info = await getCompetitionInfo();
 * // {
 * //   result: [
 * //     {
 * //       title: '我校2026年上半年全国大学英语四、六级 及英语专业四级考试顺利举行',
 * //       url: 'https://jwnews.sicau.edu.cn/jwnews/view.asp?id=1396',
 * //       date: '06-15'
 * //     },
 * //     {
 * //       title: '行走的课堂：《茶叶生产经营实践》打造产教融合特色课',
 * //       url: 'https://jwnews.sicau.edu.cn/jwnews/view.asp?id=1395',
 * //       date: '06-12'
 * //     },
 * //     {
 * //       title: '走进"熊猫老家" 探秘生物多样性——生命科学学院2023级生物科学专业赴宝兴开展综合实习',
 * //       url: 'https://jwnews.sicau.edu.cn/jwnews/view.asp?id=1393',
 * //       date: '06-11'
 * //     }
 * //   ],
 * //   success: true
 * // }
 * ```
 * 
 * @example 失败示例
 * ```ts
 * // 网络异常或未登录时
 * const info = await getCompetitionInfo();
 * // {
 * //   result: [],
 * //   success: false
 * // }
 * ```
 */
export const getCompetitionInfo = async (): Promise<NoticeResult> => {
  try {
    const html = await fetchJiaowuHtml(INDEX_URL);
    return extractCompetitionInfo(html);
  } catch (error) {
    console.error('获取竞赛通知失败:', error);
    return { result: [], success: false };
  }
};
