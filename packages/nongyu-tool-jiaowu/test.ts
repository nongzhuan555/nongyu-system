/**
 * 自动化测试脚本
 * 用于验证重构后的工具库各项功能是否正常工作
 */

import {
  getPersonalInfo,
  getScoreInfo,
  getExamInfo,
  getNoticeInfo,
  getProgressInfo,
  getRankInfo,
  getCourseInfo,
  getPlanInfo,
  getTeacherInfo,
  getClassroomInfo,
  getClassroomCourseInfoByName,
  getTeacherCourseInfoByName,
  getCompetitionInfo,
  // getKaikeInfo,
} from './core/jiaowu';
import { setLoginData, jiaowuLogin } from './core/login';

/**
 * 设置测试账号凭据
 * 请确保该账号在教务系统中有效
 */
setLoginData(
  '202308596',
  '17318269035TL',
);

/**
 * 安全执行测试，捕获单个接口的错误，避免影响其他接口
 */
async function safeTest<T>(name: string, fn: () => Promise<T>) {
  console.log(`\n[${name}] 正在测试...`);
  try {
    const result = await fn();

    // 处理通知和考试安排数据，只显示前5条
    if (name === '教务通知' || name === '考试安排') {
      const limitedResult: any = {
        ...(result as any),
        result: (result as any).result.slice(0, 5),
      };
      console.log(`[${name}] 测试结果 (只展示前5条):`, JSON.stringify(limitedResult, null, 2));
    } else if (name === '培养方案') {
      const r: any = result;
      const limitedResult = {
        ...r,
        result: {
          title: r.result?.title,
          courses: r.result?.courses?.slice(0, 3),
        },
      };
      console.log(`[${name}] 测试结果 (只展示前3条):`, JSON.stringify(limitedResult, null, 2));
    } else if (name === '教室信息') {
      const r: any = result;
      console.log(`[${name}] 总数: ${r.result?.length}`);
      console.log(`[${name}] 前3条:`, JSON.stringify(r.result?.slice(0, 3), null, 2));
    } else if (name === '教室课程') {
      const r: any = result;
      console.log(`[${name}] 教室: ${r.result?.classroomName}, 学期: ${r.result?.semester}, 槽位数: ${r.result?.slots?.length}`);
      // 展示前3个槽位
      const preview = r.result?.slots?.slice(0, 3)?.map((s: any) => ({
        星期: `星期${s.dayOfWeek}`,
        时段: `${s.period} ${s.slot}`,
        课程数: s.courses.length,
        课程: s.courses.map((c: any) => `${c.courseName}(${c.teacher}${c.weekRange ? ', ' + c.weekRange + '周' : ''})`),
      }));
      console.log(`[${name}] 前3个槽位:`, JSON.stringify(preview, null, 2));
    } else if (name === '开课目录') {
      const r: any = result;
      console.log(`[${name}] 学期: ${r.result?.semester}, 总课程数: ${r.result?.courses?.length}`);
      // 展示前3条
      const preview = r.result?.courses?.slice(0, 3)?.map((c: any) => ({
        序号: c.index,
        课程名称: c.courseName,
        教师: c.teacher,
        学分: c.credits,
        地点: c.classroom,
        周次: c.weekRange,
        已选: `${c.selectedCount}/${c.plannedCount}`,
        班级: c.className,
      }));
      console.log(`[${name}] 前3条:`, JSON.stringify(preview, null, 2));
    } else {
      console.log(`[${name}] 测试结果 (完整返回):`, JSON.stringify(result, null, 2));
    }
  } catch (error: any) {
    console.error(`[${name}] 测试失败:`, error.message || String(error));
  }
}

/**
 * 测试执行主函数
 */
async function runTests() {
  console.log('--- [农屿教务工具库] 开始自动化测试 ---');
  // 先登录
  // await jiaowuLogin();
  // 无需鉴权的公共信息
  // await safeTest('教务通知', getNoticeInfo);
  // await safeTest('竞赛通知', getCompetitionInfo);
  // await safeTest('教室课表', () => getClassroomCourseInfoByName('10-A104'));
  // await safeTest('教师课表', () => getTeacherCourseInfoByName('吴德'));
  // 需要鉴权的个人信息
  // await safeTest('个人信息', getPersonalInfo);
  // await safeTest('成绩信息', getScoreInfo);
  // await safeTest('考试安排', getExamInfo);
  // await safeTest('学业进度', getProgressInfo);
  // await safeTest('排名信息', getRankInfo);
  // await safeTest('课表信息', getCourseInfo);
  // await safeTest('培养方案', getPlanInfo);
  // 后续版本发布
  // await safeTest('开课目录', getKaikeInfo); // 后续版本完善此函数,目标为可根据参数查询开课信息,用于查课查教师以及配合培养方案函数做课程推荐
  // await safeTest('教师信息', getTeacherInfo); // 根据教师编码获取教师信息，已接通但暂无便捷获取教师编码的函数配合使用

  console.log('\n--- [农屿教务工具库] 测试流程结束 ---');
}

// 启动测试
runTests();
