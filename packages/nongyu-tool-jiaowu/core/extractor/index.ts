/**
 * 数据提取器统一导出入口
 * 将各业务模块的 HTML 清洗提取函数汇总导出
 */

// 个人信息提取
export * from './personalInfoExtractor';

// 教务通知提取（包含教学和竞赛通知）
export * from './noticeInfoExtractor';

// 学业进度提取
export * from './progressInfoExtractor';

// 排名信息提取
export * from './rankInfoExtractor';

// 成绩信息提取
export * from './scoreInfoExtractor';

// 考试安排提取
export * from './examInfoExtractor';

// 课表信息提取
export * from './courseInfoExtractor';

// 培养方案提取
export * from './planInfoExtractor';

// 教师信息提取
export * from './teacherInfoExtractor';

// 教室信息提取
export * from './classroomInfoExtractor';

// 教室课程信息提取
export * from './classroomCourseInfoExtractor';

// 竞赛通知提取
export * from './competitionInfoExtractor';

// 开课目录提取
export * from './kaikeInfoExtractor';

// 教师课表信息提取
export * from './teacherCourseInfoExtractor';
