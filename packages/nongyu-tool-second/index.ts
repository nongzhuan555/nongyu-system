/**
 * nongyu-tool-second
 * 农屿二课（i川农）工具库
 *
 * 只读查询 + 登录会话；报名等写操作见文档，本包不导出。
 */

export { SECOND_BASE_URL, SICAU_SCHOOL_SID } from "./core/constants";

export {
  setLoginData,
  secondLogin,
  clearLoginData,
  getLoginData,
  getAccessToken,
  setAccessToken,
  type SecondLoginResult,
  type SecondLoginUser,
} from "./core/login";

export {
  attachSecondHttpLogger,
  SECOND_NETWORK_HINT,
  isSecondTimeoutError,
  resolveSecondErrorMessage,
  type SecondHttpLogEvent,
  type SecondResult,
} from "./core/utils";

export {
  getUserInfo,
  getReportCard,
  getActivityHoursDetail,
  getImportCreditDetail,
  listActivities,
  getActivityDetail,
  getSchoolActTypes,
  getSchoolGroups,
  getPersonalSecondInfo,
  type ListActivitiesParams,
} from "./core/second";
