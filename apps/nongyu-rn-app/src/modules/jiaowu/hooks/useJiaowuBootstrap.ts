import { useEffect } from "react";
import { loadCredentials } from "@/storage/secureCredentials";
import { loadSessionSnapshot } from "@/storage/mmkv";
import { useSessionStore, type SessionProfile } from "@/stores/session";
import {
  bridgeSetLoginData,
  restoreAspCookieFromStorage,
} from "@/modules/jiaowu/auth/jiaowuSession";

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
