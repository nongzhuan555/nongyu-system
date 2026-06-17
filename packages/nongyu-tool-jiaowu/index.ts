/**
 * nongyu-tool-jiaowu
 * 农屿教务系统工具库
 * 
 * 本工具库旨在提供四川农业大学教务系统的数据抓取与清洗功能，
 * 支持个人信息、成绩、考试安排、教务通知、学业进度及排名等数据的自动化获取。
 * 
 * @author TangLei
 * @license ISC
 */

// 导出登录与账号配置模块
export {
    setLoginData, // 开局调此函数,便于其他鉴权函数的自动重登录
    jiaowuLogin, // 主要用于农屿登录时验证教务密码
} from './core/login';

// 导出核心业务查询模块-仅限当前版本支持的功能
export {
    getRankInfo, // 获取学生的加权平均成绩及专业排名
    getCourseInfo, // 获取学生的课表信息
    getPlanInfo, // 获取学生的培养方案
    getTeacherCourseInfoByName, // 获取教师的课表信息
    getCompetitionInfo, // 获取竞赛通知
    getClassroomCourseInfoByName, // 获取教室的课表信息
    getPersonalInfo, // 获取个人信息
    getScoreInfo, // 获取成绩信息
    getExamInfo, // 获取考试安排
    getProgressInfo, // 获取学业进度
    getNoticeInfo, // 获取教务通知
   } from './core/jiaowu';


