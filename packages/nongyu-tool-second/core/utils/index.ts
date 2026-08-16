/**
 * utils 导出
 */

export {
  attachSecondAuthRefreshHooks,
  attachSecondHttpLogger,
  postQuery,
  request,
  type ExtendedAxiosRequestConfig,
  type SecondAuthRefreshHooks,
  type SecondHttpLogEvent,
} from "./request";
export {
  SECOND_NETWORK_HINT,
  isSecondTimeoutError,
  resolveSecondErrorMessage,
  secondFailResult,
} from "./errors";
export type { SecondApiEnvelope, SecondResult, SecondOk, SecondFail } from "./types";
export { isSecondApiOk, looksLikeAuthFailure } from "./types";
