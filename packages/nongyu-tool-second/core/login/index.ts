/**
 * 二课登录
 */

import { SICAU_SCHOOL_SID } from "../constants";
import { clearLoginData, getLoginData, setAccessToken, setLoginData } from "../session";
import { resolveSecondErrorMessage } from "../utils/errors";
import { postQuery, unwrapEnvelope } from "../utils/request";
import type { SecondApiEnvelope } from "../utils/types";

export type SecondLoginUser = {
  uid?: number;
  token: string;
  loginName?: string;
  sid?: string;
  schoolName?: string;
  cid?: string;
  cname?: string;
  enrollmentYear?: string;
  name?: string;
  realName?: string;
  sex?: string;
  photo?: string;
  majorName?: string;
  className?: string;
  [key: string]: unknown;
};

export type SecondLoginResult =
  | { success: true; token: string; user: SecondLoginUser; message?: string }
  | { success: false; token?: string; user?: SecondLoginUser; message: string };

/**
 * 学号登录；成功后写入内存 token 与 LOGIN_DATA
 */
export async function secondLogin(user?: string, pwd?: string): Promise<SecondLoginResult> {
  const finalUser = (user ?? getLoginData().user).trim();
  const finalPwd = (pwd ?? getLoginData().pwd).trim();

  if (!finalUser || !finalPwd) {
    return { success: false, message: "未提供学号或密码" };
  }

  try {
    const envelope = await postQuery<SecondApiEnvelope<SecondLoginUser>>(
      "/user/login/v1.0.0/snoLogin",
      {
        loginName: finalUser,
        password: finalPwd,
        sid: SICAU_SCHOOL_SID,
      },
      { skipAuth: true },
    );

    const parsed = unwrapEnvelope(envelope, null as unknown as SecondLoginUser);
    if (!parsed.ok || !parsed.data?.token) {
      return {
        success: false,
        message: parsed.message || "登录失败",
      };
    }

    setLoginData(finalUser, finalPwd);
    setAccessToken(parsed.data.token);

    return {
      success: true,
      token: parsed.data.token,
      user: parsed.data,
      message: parsed.message,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: resolveSecondErrorMessage(error, "登录异常"),
    };
  }
}

export { setLoginData, clearLoginData, getLoginData, setAccessToken };
export { getAccessToken } from "../session";
