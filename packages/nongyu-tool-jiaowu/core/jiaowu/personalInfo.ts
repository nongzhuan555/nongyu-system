/**
 * 个人信息业务模块
 */

import { extractPersonalInfo } from '../extractor';
import { fetchJiaowuHtml } from '../utils';

/**
 * 教务网个人信息页面 URL
 */
const PERSONAL_INFO_URL = 'https://jiaowu.sicau.edu.cn/xuesheng/dangan/banji/bjiben.asp';

/**
 * 获取当前登录学生的个人信息。
 * 
 * 使用场景：
 * 1. 农屿App登录后，获取当前登录学生的个人信息，个人信息存本地，同时存到数据库
 * 
 * @returns 成功返回 `{ success: true, result: PersonalInfo }`，失败返回 `{ success: false, result: null }`
 * 
 * @example 基本调用
 * ```ts
 * const info = await getPersonalInfo();
 * ```
 * 
 * @example 成功示例
 * ```ts
 * const info = await getPersonalInfo();
 * // {
 * //   result: {
 * //     name: '张三',
 * //     studentId: '20210001',
 * //     gender: '男',
 * //     college: '农学院',
 * //     major: '农学',
 * //     grade: '2021',
 * //     className: '农学202101',
 * //     identity: '本科',
 * //     studentStatus: '在读',
 * //     enrollmentDate: '2021-09-01',
 * //     ethnicity: '汉族',
 * //     politicalStatus: '共青团员',
 * //     phone: '138****0000',
 * //     examId: '202101010001',
 * //     homeAddress: '四川省成都市温江区',
 * //     campus: '成都校区'
 * //   },
 * //   success: true
 * // }
 * ```
 * 
 * @example 失败示例 - 未登录或网络异常
 * ```ts
 * const info = await getPersonalInfo();
 * // {
 * //   result: null,
 * //   success: false
 * // }
 * ```
 */
export const getPersonalInfo = async () => {
  try {
    const html = await fetchJiaowuHtml(PERSONAL_INFO_URL);
    return extractPersonalInfo(html);
  } catch (error) {
    console.error('获取个人信息失败:', error);
    return {
      result: null,
      success: false,
    };
  }
}
