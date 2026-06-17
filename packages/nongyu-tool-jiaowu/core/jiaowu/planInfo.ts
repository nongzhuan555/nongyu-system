/**
 * 培养方案查询模块
 */

import { extractPlanInfo, mergePlanCourses } from '../extractor/planInfoExtractor';
import type { PlanInfo, PlanInfoResult, PlanCourse } from '../extractor/planInfoExtractor';
import { fetchJiaowuHtml } from '../utils';

/**
 * 教务网培养方案页面基础 URL
 * y 参数代表页码
 */
const PLAN_INFO_BASE_URL = 'https://jiaowu.sicau.edu.cn/xuesheng/jihua/jihua/jjihua.asp?title_id1=1';

/**
 * 第1页和第2页的固定查询参数（y 除外）
 */
const PLAN_FIXED_PARAMS =
  'selw=1759000867099842&sel1w=1701628160642247&ww_f=&picha=yes&kl=&zh=&jsj=&ku=&o=138000931725988212671724699307668197931366003633609946376943228167901233&id=90548091&xuangai=&act=&dizhi=9785840988020453972997688133880297952929866863578930194588001753819918438126152289374695886569249728722888076463906752219720256897283988866816678668635788613004906752219720256897940479813454028668166789968406979551098198986390545351866117879795292990635111886006448932879589373345893287958991384681995783813308828800050397932019812107628128600289231145&w1=65938095660405666717622461758709812860028660720713213161617325041735350466287748623155048923909590548091978625198858456489880006&ww=&w2=&sw1=&p=80&twid=1000&wid=1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1&vrul=y%2Cy%2Cy%2Cy%2Cy%2Cy%2Cy%2Cy%2Cy%2Cy%2Cy%2Cy%2Cy%2Cy%2Cy%2Cy%2Cy%2Cy%2Cy%2Cy%2Cy%2Cy%2Cn&m=&rul=176268648660115712685526866011571003881789886806105682028923099517091533885157841240912888515784173104068923099512409128905426716929716289886806100388179785423912409128866011571033708490542671681127079779842868112707892309951033708497854239129293898988680668112707866011576987742386601157178900619779842813144788977984281421357988515784127567958988680610568202&h=122742456162829512935311662877486461695990550831812688428923909588584564&rig=10012937&bh=905535119055083181217482';

/**
 * 构建指定页码的完整 URL
 */
function buildUrl(page: number): string {
  return `${PLAN_INFO_BASE_URL}&${PLAN_FIXED_PARAMS}&y=${page}`;
}

export type { PlanInfo, PlanInfoResult, PlanCourse };

/**
 * 获取学生的培养方案信息。
 * 
 * 流程：
 * 1. 请求第1页并提取课程列表
 * 2. 请求第2页并提取课程列表
 * 3. 合并去重后返回
 * 
 * 使用场景：
 * 1. 农屿app内培养方案页面供学生查看自己的培养方案。
 * 2. nongyu-agent将此作为tool调用，用于获取当前用户的培养方案。
 * 
 * @returns 成功返回 `{ success: true, result: { title: string, courses: PlanCourse[] } }`，失败返回 `{ success: false, result: null }`
 * 
 * @example 基本调用
 * ```ts
 * const plan = await getPlanInfo();
 * ```
 * 
 * @example 成功示例
 * ```ts
 * const plan = await getPlanInfo();
 * // {
 * //   result: {
 * //     title: '物联网工程2023',
 * //     courses: [
 * //       {
 * //         courseCode: '1210004000',
 * //         courseName: 'C语言程序设计',
 * //         englishName: 'C Language Programming',
 * //         courseType: '必修',
 * //         courseSystem: '专业基础课',
 * //         credits: '2.5',
 * //         totalHours: '40',
 * //         lectureHours: '40',
 * //         labHours: '0',
 * //         practiceHours: '0',
 * //         selfStudyHours: '0',
 * //         weeklyHours: ['40', '', '', '', '', '', '', '', '', ''],
 * //         execSemester: '1'
 * //       },
 * //       {
 * //         courseCode: '4210004000',
 * //         courseName: 'C语言程序设计实验',
 * //         englishName: 'C Language Programming Experiment',
 * //         courseType: '必修',
 * //         courseSystem: '专业基础课',
 * //         credits: '1.5',
 * //         totalHours: '24',
 * //         lectureHours: '0',
 * //         labHours: '24',
 * //         practiceHours: '0',
 * //         selfStudyHours: '0',
 * //         weeklyHours: ['24', '', '', '', '', '', '', '', '', ''],
 * //         execSemester: '1'
 * //       },
 * //       {
 * //         courseCode: '1212418010',
 * //         courseName: '大学生心理健康与职业发展Ⅰ（国防安全卫生）',
 * //         englishName: 'Mental Health and Career Development of College Students Ⅰ...',
 * //         courseType: '实践教学',
 * //         courseSystem: '通识实践',
 * //         credits: '0.5',
 * //         totalHours: '0',
 * //         lectureHours: '0',
 * //         labHours: '0',
 * //         practiceHours: '0.5',
 * //         selfStudyHours: '0',
 * //         weeklyHours: ['', '', '', '', '', '', '', '', '', ''],
 * //         execSemester: '1'
 * //       }
 * //     ]
 * //   },
 * //   success: true
 * // }
 * ```
 * 
 * @example 失败示例
 * ```ts
 * // 网络异常或未登录时
 * const plan = await getPlanInfo();
 * // {
 * //   result: null,
 * //   success: false
 * // }
 * ```
 */
export const getPlanInfo = async (): Promise<PlanInfoResult> => {
  try {
    // 并行请求两页
    const [html1, html2] = await Promise.all([
      fetchJiaowuHtml(buildUrl(1)),
      fetchJiaowuHtml(buildUrl(2)),
    ]);

    // 分别提取
    const page1Result = extractPlanInfo(html1);
    const page2Result = extractPlanInfo(html2);

    // 合并课程列表（第1页的标题为准）
    const allCourses = mergePlanCourses([
      page1Result.result?.courses || [],
      page2Result.result?.courses || [],
    ]);

    return {
      result: {
        title: page1Result.result?.title || '',
        courses: allCourses,
      },
      success: allCourses.length > 0,
    };
  } catch (error) {
    console.error('获取培养方案失败:', error);
    return { result: null, success: false };
  }
};
