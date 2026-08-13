import { useEffect } from "react";
import { loadCredentials } from "@/storage/secureCredentials";
import { loadSessionSnapshot } from "@/storage/mmkv";
import { useSessionStore, type SessionProfile } from "@/stores/session";
import {
  bridgeSetLoginData,
  restoreAspCookieFromStorage,
} from "@/modules/jiaowu/auth/jiaowuSession";

/**
 * 开发预览：无真实凭据时强制已登录，便于看「我的」等页效果。
 * 联调完整登录链路后务必改为 false 或删除。
 */
const DEV_FORCE_AUTHENTICATED = __DEV__ && true;

/** 强制登录时的假档案（仅 UI 预览，无教务 Cookie） */
const DEV_PREVIEW_PROFILE: SessionProfile = {
  studentId: "2021000001",
  name: "预览同学",
  college: "信息工程学院",
  major: "计算机科学与技术",
  grade: "2021",
  className: "计科2101",
  gender: "未知",
  campus: "成都校区",
  hometown: "四川省成都市",
};

/**
 * 解析冷启动档案；损坏数据则忽略
 */
function parseStoredProfile(raw: string | undefined, fallbackId: string): SessionProfile {
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as SessionProfile;
      if (parsed?.studentId) {
        return {
          studentId: parsed.studentId,
          name: parsed.name || "",
          college: parsed.college,
          major: parsed.major,
          grade: parsed.grade,
          className: parsed.className,
          gender: parsed.gender,
          campus: parsed.campus,
          hometown: parsed.hometown,
        };
      }
    } catch {
      // ignore corrupt cache
    }
  }
  return { studentId: fallbackId, name: "" };
}

/**
 * App 冷启动：从 SecureStore / MMKV 恢复教务会话桥接与档案
 * 不主动打教务网；有凭据即视为本地已登录，后续请求由工具拦截器按需重登
 */
export function useJiaowuBootstrap() {
  const setHydrated = useSessionStore((s) => s.setHydrated);
  const setSession = useSessionStore((s) => s.setSession);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const creds = await loadCredentials();
        if (cancelled) return;

        if (creds) {
          bridgeSetLoginData(creds.studentId, creds.password);
          restoreAspCookieFromStorage();
          const snapshot = loadSessionSnapshot();
          const profile = parseStoredProfile(snapshot.profileJson, creds.studentId);
          setSession({ profile, token: snapshot.token ?? null });
        } else if (DEV_FORCE_AUTHENTICATED) {
          // 无凭据时注入预览会话；不写 SecureStore / 不桥接教务
          setSession({ profile: DEV_PREVIEW_PROFILE, token: null });
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setHydrated, setSession]);
}
