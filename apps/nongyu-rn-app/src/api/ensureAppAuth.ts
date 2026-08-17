import { appAuthLogin, type JiaowuProfilePayload } from "@/api/appAuth";
import { parseAppUserRole } from "@/api/parseAppUserRole";
import { saveSessionSnapshot } from "@/storage/mmkv";
import { useSessionStore } from "@/stores/session";

/**
 * 与 getAppAccessToken 同优先级，避免本文件依赖 appClient 造成环
 */
function readExistingToken(): string | null {
  const sessionToken = useSessionStore.getState().token;
  if (sessionToken) return sessionToken;

  if (__DEV__) {
    const devToken = process.env.EXPO_PUBLIC_DEV_APP_TOKEN?.trim();
    if (devToken) return devToken;
  }

  return null;
}

/**
 * 会话档案 → 登录签发请求体（不含设备字段，由 appAuthLogin 补齐）
 */
function profileToLoginPayload(): JiaowuProfilePayload | null {
  const profile = useSessionStore.getState().profile;
  if (!profile?.studentId?.trim() || !profile.name?.trim()) return null;
  return {
    studentNo: profile.studentId.trim(),
    name: profile.name.trim(),
    major: profile.major,
    college: profile.college,
    className: profile.className,
    grade: profile.grade,
    gender: profile.gender,
    hometown: profile.hometown,
    campus: profile.campus,
  };
}

/**
 * 确保可用 App JWT：已有则直接返回；否则用当前档案向 Node 补签发并落盘。
 * 供广场等需鉴权场景在无票时重试，避免「教务已登录但 token 为空」。
 */
export async function ensureAppAccessToken(): Promise<string | null> {
  const existing = readExistingToken();
  if (existing) return existing;

  const payload = profileToLoginPayload();
  if (!payload) return null;

  try {
    const auth = await appAuthLogin(payload);
    const profile = useSessionStore.getState().profile;
    if (!profile) return auth.token;

    const role = parseAppUserRole(auth.user);
    useSessionStore.getState().setSession({ profile, token: auth.token, role });
    saveSessionSnapshot(JSON.stringify(profile), auth.token, role);
    return auth.token;
  } catch {
    return null;
  }
}
