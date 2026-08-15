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
/** 课表开学日（epoch ms 字符串） */
export const COURSE_SEMESTER_START_KEY = "course:semester_start_ms";
/** 课表是否高亮当日列（"1" / "0"） */
export const COURSE_HIGHLIGHT_TODAY_KEY = "course:highlight_today_column";
/** 课表背景图本地 URI */
export const COURSE_BACKGROUND_URI_KEY = "course:background_uri";
/** 课表卡片大小 sm|md|lg */
export const COURSE_CARD_SIZE_KEY = "course:card_size";
/** 课表卡片字号 sm|md|lg */
export const COURSE_FONT_SIZE_KEY = "course:font_size";
/** 网页是否在应用内打开（"1" / "0"；缺省视为应用内） */
export const OPEN_WEB_IN_APP_KEY = "app:open_web_in_app";
/** AI 入口气泡「不再提醒」（"1"；登出清除） */
export const AI_TIP_MUTED_KEY = "app:ai_tip_muted";
/** 主题品牌 green|sakura */
export const THEME_BRAND_KEY = "app:theme_brand";
/** 主题外观 light|dark|system */
export const THEME_APPEARANCE_KEY = "app:theme_appearance";
/** 启动主 Tab：home | course（缺省 home） */
export const LAUNCH_TAB_KEY = "app:launch_tab";

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

/** 二课 x-access-token（非密码级，可 MMKV） */
export const SECOND_ACCESS_TOKEN_KEY = "second:access_token";

/**
 * 读取二课 token
 */
export function getSecondAccessToken(): string | undefined {
  return appStorage.getString(SECOND_ACCESS_TOKEN_KEY);
}

/**
 * 写入二课 token
 */
export function setSecondAccessToken(token: string): void {
  appStorage.set(SECOND_ACCESS_TOKEN_KEY, token);
}

/**
 * 清除二课 token
 */
export function clearSecondAccessToken(): void {
  appStorage.delete(SECOND_ACCESS_TOKEN_KEY);
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

/**
 * AI 气泡是否已「不再提醒」
 */
export function isAiTipMuted(): boolean {
  return appStorage.getString(AI_TIP_MUTED_KEY) === "1";
}

/**
 * 写入「不再提醒」
 */
export function setAiTipMuted(muted: boolean): void {
  if (muted) appStorage.set(AI_TIP_MUTED_KEY, "1");
  else appStorage.delete(AI_TIP_MUTED_KEY);
}

/**
 * 清除「不再提醒」（登出时调用）
 */
export function clearAiTipMuted(): void {
  appStorage.delete(AI_TIP_MUTED_KEY);
}
