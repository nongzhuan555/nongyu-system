import { MMKV } from "react-native-mmkv";

/**
 * 业务偏好 / 课表缓存等非敏感存储
 * Dev Client 原生可用；Expo Go / 无原生时回退内存 Map，避免骨架阶段直接崩溃
 */
type KvStore = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
};

function createMemoryStore(): KvStore {
  const map = new Map<string, string>();
  return {
    getString: (key) => map.get(key),
    set: (key, value) => {
      map.set(key, value);
    },
    delete: (key) => {
      map.delete(key);
    },
  };
}

function createMmkvStore(): KvStore {
  const mmkv = new MMKV({ id: "nongyu-app" });
  return {
    getString: (key) => mmkv.getString(key),
    set: (key, value) => {
      mmkv.set(key, value);
    },
    delete: (key) => {
      mmkv.delete(key);
    },
  };
}

let storage: KvStore;

try {
  storage = createMmkvStore();
} catch {
  storage = createMemoryStore();
}

export const appStorage = storage;

/** 教务 ASP Cookie 持久化 key（非密码级，可 MMKV） */
export const JIAOWU_ASP_COOKIE_KEY = "jiaowu:asp_cookie";
/** 本地会话档案摘要（非密码） */
export const SESSION_PROFILE_KEY = "session:profile";
/** 农屿 App Token（冷启动恢复用） */
export const SESSION_TOKEN_KEY = "session:app_token";

/**
 * 读取缓存的教务 ASP Cookie
 */
export function getJiaowuAspCookie(): string | undefined {
  return appStorage.getString(JIAOWU_ASP_COOKIE_KEY);
}

/**
 * 写入教务 ASP Cookie
 */
export function setJiaowuAspCookie(cookie: string): void {
  appStorage.set(JIAOWU_ASP_COOKIE_KEY, cookie);
}

/**
 * 清除教务 ASP Cookie
 */
export function clearJiaowuAspCookie(): void {
  appStorage.delete(JIAOWU_ASP_COOKIE_KEY);
}

/**
 * 持久化会话档案与 Token（登出须清除）
 */
export function saveSessionSnapshot(profileJson: string, token: string | null): void {
  appStorage.set(SESSION_PROFILE_KEY, profileJson);
  if (token) appStorage.set(SESSION_TOKEN_KEY, token);
  else appStorage.delete(SESSION_TOKEN_KEY);
}

/**
 * 读取冷启动会话快照
 */
export function loadSessionSnapshot(): { profileJson?: string; token?: string } {
  return {
    profileJson: appStorage.getString(SESSION_PROFILE_KEY),
    token: appStorage.getString(SESSION_TOKEN_KEY),
  };
}

/**
 * 清除会话快照
 */
export function clearSessionSnapshot(): void {
  appStorage.delete(SESSION_PROFILE_KEY);
  appStorage.delete(SESSION_TOKEN_KEY);
}
