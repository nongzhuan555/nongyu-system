/**
 * 教师信息查询模块
 */

import { extractTeacherInfo } from '../extractor/teacherInfoExtractor';
import type { TeacherInfo, TeacherInfoResult } from '../extractor/teacherInfoExtractor';
import { fetchJiaowuHtml } from '../utils';


export type { TeacherInfo, TeacherInfoResult };

/**
 * 获取教师个人信息
 *
 * @returns 教师基本信息对象
 *
 * @example
 * const info = await getTeacherInfo(teacherCode);
 * if (info.success) {
 *   console.log(info.result?.name, info.result?.department);
 * }
 */
export const getTeacherInfo = async (teacherCode: string): Promise<TeacherInfoResult> => {
    try {
        const TEACHER_INFO_URL =
            `https://jiaowu.sicau.edu.cn/xuesheng/gongxuan/gongxuan/jiaoshishow.asp?title_id1=2&xingming=${teacherCode}`;
        const html = await fetchJiaowuHtml(TEACHER_INFO_URL);
        return extractTeacherInfo(html);
    } catch (error) {
        console.error('获取教师信息失败:', error);
        return { result: null, success: false };
    }
};
