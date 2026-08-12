import { Platform } from "react-native";
import * as Application from "expo-application";
import * as Device from "expo-device";
import { API_BASE_URL } from "@/config/env";

/** 教务档案摘要（提交给 Node，不含教务密码） */
export type JiaowuProfilePayload = {
  studentNo: string;
  name: string;
  major?: string;
  college?: string;
  className?: string;
  grade?: string;
  gender?: string;
  hometown?: string;
  campus?: string;
};

export type AppAuthLoginResult = {
  token: string;
  isNewUser: boolean;
  user: Record<string, unknown>;
};

/**
 * 解析设备稳定标识（优先 Android ID / iOS IDFV）
 */
async function resolveDeviceId(): Promise<string> {
  try {
    if (Platform.OS === "android") {
      const id = Application.getAndroidId();
      if (id) return id;
    }
    if (Platform.OS === "ios") {
      const id = await Application.getIosIdForVendorAsync();
      if (id) return id;
    }
  } catch {
    // 忽略，走兜底
  }
  return `device-${Platform.OS}-${Date.now()}`;
}

/**
 * POST /api/app/auth/login —— 登录即注册，签发 App JWT（best-effort）
 */
export async function appAuthLogin(profile: JiaowuProfilePayload): Promise<AppAuthLoginResult> {
  const deviceId = await resolveDeviceId();
  const body = {
    studentNo: profile.studentNo,
    name: profile.name,
    major: profile.major,
    college: profile.college,
    className: profile.className,
    grade: profile.grade,
    gender: profile.gender,
    hometown: profile.hometown,
    campus: profile.campus,
    deviceId,
    deviceBrand: Device.brand ?? undefined,
    deviceModel: Device.modelName ?? undefined,
    deviceOs: Device.osName ? `${Device.osName} ${Device.osVersion ?? ""}`.trim() : undefined,
  };

  const response = await fetch(`${API_BASE_URL}/api/app/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`农屿登录失败 (${response.status})${text ? `: ${text}` : ""}`);
  }

  const json = (await response.json()) as {
    data?: AppAuthLoginResult;
    token?: string;
  };

  // 兼容 { data: { token, ... } } 与扁平结构
  if (json.data?.token) return json.data;
  if (json.token) return json as unknown as AppAuthLoginResult;
  throw new Error("农屿登录响应缺少 token");
}
