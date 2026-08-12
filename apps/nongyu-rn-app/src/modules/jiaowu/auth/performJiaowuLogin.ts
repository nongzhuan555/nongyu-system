import { QueryClient } from "@tanstack/react-query";
import { getPersonalInfo } from "nongyu-tool-jiaowu";
import Toast from "react-native-toast-message";
import { appAuthLogin } from "@/api/appAuth";
import { clearCredentials, saveCredentials } from "@/storage/secureCredentials";
import { clearSessionSnapshot, saveSessionSnapshot } from "@/storage/mmkv";
import { useSessionStore, type SessionProfile } from "@/stores/session";
import {
  bridgeJiaowuLogin,
  bridgeSetLoginData,
  clearJiaowuToolSession,
  persistCurrentAspCookie,
} from "./jiaowuSession";

export type PerformJiaowuLoginInput = {
  studentId: string;
  password: string;
  queryClient?: QueryClient;
};

export type PerformJiaowuLoginResult = {
  ok: boolean;
  message?: string;
  /** Node 登录是否成功（失败不影响本地教务会话） */
  nodeOk: boolean;
};

/**
 * 完整登录流程：教务校验 → 档案 →（best-effort）Node → 持久化
 */
export async function performJiaowuLogin(
  input: PerformJiaowuLoginInput,
): Promise<PerformJiaowuLoginResult> {
  const { studentId, password, queryClient } = input;
  const trimmedId = studentId.trim();
  const trimmedPwd = password.trim();

  if (!trimmedId || !trimmedPwd) {
    return { ok: false, message: "请输入学号和密码", nodeOk: false };
  }

  const loginResult = await bridgeJiaowuLogin(trimmedId, trimmedPwd);
  if (!loginResult.success) {
    return {
      ok: false,
      message: loginResult.message || "教务登录失败",
      nodeOk: false,
    };
  }

  const personal = await getPersonalInfo();
  if (!personal.success || !personal.result) {
    return {
      ok: false,
      message: "获取个人档案失败，请稍后重试",
      nodeOk: false,
    };
  }

  const info = personal.result;
  const profile: SessionProfile = {
    studentId: info.studentId || trimmedId,
    name: info.name || "",
    college: info.college,
    major: info.major,
    grade: info.grade,
    className: info.className,
    gender: info.gender,
    campus: info.campus,
    hometown: info.homeAddress,
  };

  if (!profile.name) {
    return {
      ok: false,
      message: "档案缺少姓名，无法完成登录",
      nodeOk: false,
    };
  }

  // Node 登录 best-effort：失败仍可进入教务
  let token: string | null = null;
  let nodeOk = false;
  try {
    const auth = await appAuthLogin({
      studentNo: profile.studentId,
      name: profile.name,
      major: profile.major,
      college: profile.college,
      className: profile.className,
      grade: profile.grade,
      gender: profile.gender,
      hometown: profile.hometown,
      campus: profile.campus,
    });
    token = auth.token;
    nodeOk = true;
  } catch {
    Toast.show({
      type: "info",
      text1: "农屿服务未接通",
      text2: "已建立本地教务会话，部分云端能力暂不可用",
    });
  }

  await saveCredentials(trimmedId, trimmedPwd);
  bridgeSetLoginData(trimmedId, trimmedPwd);
  persistCurrentAspCookie();
  saveSessionSnapshot(JSON.stringify(profile), token);

  useSessionStore.getState().setSession({ profile, token });

  if (queryClient) {
    await queryClient.invalidateQueries({ queryKey: ["jiaowu"] });
  }

  return { ok: true, nodeOk };
}

/**
 * 登出：清凭据、Cookie、会话与教务 Query 缓存
 */
export async function performJiaowuLogout(queryClient?: QueryClient): Promise<void> {
  await clearCredentials();
  clearJiaowuToolSession();
  clearSessionSnapshot();
  useSessionStore.getState().clearSession();
  if (queryClient) {
    queryClient.removeQueries({ queryKey: ["jiaowu"] });
  }
}
