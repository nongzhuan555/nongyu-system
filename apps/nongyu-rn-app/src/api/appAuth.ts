import { Platform } from "react-native";
import * as Application from "expo-application";
import * as Device from "expo-device";
import { API_BASE_URL } from "@/config/env";
import { parseApiResponse } from "@/api/appClient";
import { reportAppRequestError } from "@/modules/telemetry/reportRequest";
import { appStorage } from "@/storage/mmkv";

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

const DEVICE_ID_KEY = "session:device_id";

/** 与 Node appLoginSchema 对齐的可选字符串上限 */
const FIELD_MAX = {
  name: 64,
  major: 128,
  college: 128,
  className: 128,
  grade: 32,
  hometown: 64,
  campus: 64,
  deviceBrand: 64,
  deviceModel: 128,
  deviceOs: 64,
} as const;

/**
 * 截断可选字符串，避免教务长地址等触发 Node 400 导致「已登录无 Token」
 */
function clipOptional(value: string | undefined | null, max: number): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

/**
 * 仅保留 Node parseGender 可识别的性别；其它省略，由服务端按未知处理
 */
function sanitizeGender(gender: string | undefined): string | undefined {
  if (gender == null) return undefined;
  const g = gender.trim();
  if (!g) return undefined;
  if (g === "男" || g === "女" || g === "未知" || g === "0" || g === "1" || g === "2") return g;
  return undefined;
}

/**
 * 解析并持久化设备稳定标识（优先 Android ID / iOS IDFV）
 * 同一安装周期内保持不变，避免无谓顶号
 */
async function resolveDeviceId(): Promise<string> {
  const cached = appStorage.getString(DEVICE_ID_KEY);
  if (cached) return cached;

  let id: string | undefined;
  try {
    if (Platform.OS === "android") {
      id = Application.getAndroidId() || undefined;
    } else if (Platform.OS === "ios") {
      id = (await Application.getIosIdForVendorAsync()) || undefined;
    }
  } catch {
    // 忽略，走兜底
  }

  const resolved = id || `device-${Platform.OS}-${Date.now()}`;
  appStorage.set(DEVICE_ID_KEY, resolved);
  return resolved;
}

/**
 * POST /api/app/auth/login —— 登录即注册，签发 App JWT
 */
export async function appAuthLogin(profile: JiaowuProfilePayload): Promise<AppAuthLoginResult> {
  const deviceId = await resolveDeviceId();
  const body = {
    studentNo: profile.studentNo.trim(),
    name: clipOptional(profile.name, FIELD_MAX.name) || profile.name.trim(),
    major: clipOptional(profile.major, FIELD_MAX.major),
    college: clipOptional(profile.college, FIELD_MAX.college),
    className: clipOptional(profile.className, FIELD_MAX.className),
    grade: clipOptional(profile.grade, FIELD_MAX.grade),
    gender: sanitizeGender(profile.gender),
    hometown: clipOptional(profile.hometown, FIELD_MAX.hometown),
    campus: clipOptional(profile.campus, FIELD_MAX.campus),
    deviceId,
    deviceBrand: clipOptional(Device.brand, FIELD_MAX.deviceBrand),
    deviceModel: clipOptional(Device.modelName, FIELD_MAX.deviceModel),
    deviceOs: clipOptional(
      Device.osName ? `${Device.osName} ${Device.osVersion ?? ""}`.trim() : undefined,
      FIELD_MAX.deviceOs,
    ),
  };

  const path = "/api/app/auth/login";
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "网络请求失败";
    reportAppRequestError({ kind: "network", message, method: "POST", path });
    throw error;
  }

  return parseApiResponse<AppAuthLoginResult>(response, { method: "POST", path });
}

/**
 * GET /api/app/auth/me —— 校验当前 App Token
 * @param skipAuthInvalidHandler 冷启动验票时自行处理，避免与 bootstrap 竞态
 */
export async function appAuthMe(
  token: string,
  options?: { skipAuthInvalidHandler?: boolean },
): Promise<Record<string, unknown>> {
  const path = "/api/app/auth/me";
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "网络请求失败";
    reportAppRequestError({ kind: "network", message, method: "GET", path });
    throw error;
  }
  return parseApiResponse<Record<string, unknown>>(response, {
    skipAuthInvalidHandler: options?.skipAuthInvalidHandler,
    method: "GET",
    path,
  });
}

/**
 * POST /api/app/auth/logout
 */
export async function appAuthLogout(token: string): Promise<void> {
  const path = "/api/app/auth/logout";
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "网络请求失败";
    reportAppRequestError({ kind: "network", message, method: "POST", path });
    throw error;
  }
  await parseApiResponse<null>(response, { allowNullData: true, method: "POST", path });
}
