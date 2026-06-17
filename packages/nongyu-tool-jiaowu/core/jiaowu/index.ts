/**
 * 农屿教务工具库功能统一导出入口，只导出直接给外部调用的工具，不导出内部辅助函数
 */

// 获取教务网首页的教务通知信息，无需鉴权
export { getNoticeInfo } from './noticeInfo';
// 获取教务网首页的竞赛通知信息，无需鉴权
export { getCompetitionInfo } from './competitionInfo';
// 获取教务网记录的开课目录信息（尚未完善，暂不导出）
// export { getKaikeInfo } from './kaikeInfo';
// 获取用户在教务网记录的个人信息
export { getPersonalInfo } from './personalInfo';
// 获取用户在教务网记录的成绩信息
export { getScoreInfo } from './scoreInfo';
// 获取用户在教务网记录的考试安排信息
export { getExamInfo } from './examInfo';
// 获取用户在教务网记录的学业进度信息
export { getProgressInfo } from './progressInfo';
// 获取用户在教务网记录的培养方案信息
export { getPlanInfo } from './planInfo';
// 获取用户在教务网记录的排名信息
export { getRankInfo } from './rankInfo';
// 获取用户在教务网记录的课表信息-个人课表
export { getCourseInfo } from './courseInfo';
// 获取教务网的教室课程信息-根据教室名字查询教室的课表
export { getClassroomCourseInfoByName } from './classroomCourseInfo';
// 获取教务网的教师课程信息-根据教师名字查询教师的课表
export { getTeacherCourseInfoByName } from './teacherCourseInfo';
// 获取教务网的教室信息-支持根据教室名称模糊查询，不提供名字则返回所有教室
export { getClassroomInfo } from './classroomInfo';
// 获取教务网的教师信息-此函数仅根据教师在教务网的编号查询，不支持根据教师姓名查询
export { getTeacherInfo } from './teacherInfo';