import { create } from "zustand";
import { appStorage, OPEN_WEB_IN_APP_KEY } from "@/storage/mmkv";

function readOpenWebInApp(): boolean {
  const raw = appStorage.getString(OPEN_WEB_IN_APP_KEY);
  if (raw === undefined) return true;
  return raw !== "0";
}

type AppWebPrefsState = {
  /** true = expo-web-browser；false = 系统浏览器 */
  openWebInApp: boolean;
  setOpenWebInApp: (value: boolean) => void;
};

/**
 * App 网页打开偏好（设备级，登出不清除）
 */
export const useAppWebPrefsStore = create<AppWebPrefsState>((set) => ({
  openWebInApp: readOpenWebInApp(),
  setOpenWebInApp: (value) => {
    appStorage.set(OPEN_WEB_IN_APP_KEY, value ? "1" : "0");
    set({ openWebInApp: value });
  },
}));
