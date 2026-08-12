import { Platform } from "react-native";
import * as Application from "expo-application";
import * as Device from "expo-device";
import { API_BASE_URL } from "@/config/env";
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

type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T | null;
};

const DEVICE_ID_KEY = "session:device_id";

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
 * 解析统一响应包；业务失败抛出带 message 的 Error
 * @param allowNullData 登出等接口成功时 data 可为 null
 */
async function parseApiResponse<T>(
  response: Response,
  options?: { allowNullData?: boolean },
): Promise<T> {
  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error(`农屿接口响应非 JSON (HTTP ${response.status})`);
  }

  if (!response.ok || json.code !== 0) {
    throw new Error(json.message || `农屿接口失败 (HTTP ${response.status}, code=${json.code})`);
  }

  if (json.data == null && !options?.allowNullData) {
    throw new Error(json.message || "农屿接口响应缺少 data");
  }

  return json.data as T;
}

/**
 * POST /api/app/auth/login —— 登录即注册，签发 App JWT
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

  return parseApiResponse<AppAuthLoginResult>(response);
}

/**
 * GET /api/app/auth/me —— 校验当前 App Token
 */
export async function appAuthMe(token: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_BASE_URL}/api/app/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  return parseApiResponse<Record<string, unknown>>(response);
}

/**
 * POST /api/app/auth/logout
 */
export async function appAuthLogout(token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/app/auth/logout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  await parseApiResponse<null>(response, { allowNullData: true });
}
