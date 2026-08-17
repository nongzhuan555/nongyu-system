import axios from "axios";
import { AUTH_ERROR_CODES } from "./constants";
import { AdminApiError } from "./adminApi";

const CREDENTIAL_CODES = new Set<number>([
  AUTH_ERROR_CODES.ADMIN_PASSWORD_WRONG,
  AUTH_ERROR_CODES.USER_NOT_FOUND,
  AUTH_ERROR_CODES.ADMIN_REQUIRED,
]);

/** 将登录失败映射为 Spec §4.2 文案，避免泄露「是否管理员」。 */
export function getLoginErrorMessage(error: unknown): string {
  if (error instanceof AdminApiError) {
    if (CREDENTIAL_CODES.has(error.code)) {
      return "学号或密码错误";
    }
    if (error.code === AUTH_ERROR_CODES.ACCOUNT_DISABLED) {
      return "账号已禁用";
    }
    if (error.code === AUTH_ERROR_CODES.VALIDATION && error.serverMessage.includes("过于频繁")) {
      return "登录尝试过于频繁，请稍后再试";
    }
    if (error.code === AUTH_ERROR_CODES.VALIDATION) {
      return "请输入 9 位学号";
    }
    return "服务异常，请稍后重试";
  }

  if (axios.isAxiosError(error) && error.response === undefined) {
    return "网络异常，请稍后重试";
  }

  return "网络异常，请稍后重试";
}

/** App handoff 自动登录失败文案 */
export function getHandoffErrorMessage(error: unknown): string {
  if (error instanceof AdminApiError) {
    if (
      error.code === AUTH_ERROR_CODES.TOKEN_INVALID ||
      error.code === AUTH_ERROR_CODES.TOKEN_REVOKED ||
      error.code === AUTH_ERROR_CODES.UNAUTHORIZED
    ) {
      return "登录链接已失效，请从 App 重新打开";
    }
    if (error.code === AUTH_ERROR_CODES.VALIDATION && error.serverMessage.includes("过于频繁")) {
      return "登录尝试过于频繁，请稍后再试";
    }
    return "自动登录失败，请手动登录";
  }

  if (axios.isAxiosError(error) && error.response === undefined) {
    return "网络异常，请稍后重试";
  }

  return "网络异常，请稍后重试";
}
