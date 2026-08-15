import { create } from "zustand";
import { appStorage, LAUNCH_TAB_KEY } from "@/storage/mmkv";

export type LaunchTab = "home" | "course";

function readLaunchTab(): LaunchTab {
  const raw = appStorage.getString(LAUNCH_TAB_KEY);
  if (raw === "course") return "course";
  return "home";
}

type AppLaunchPrefsState = {
  launchTab: LaunchTab;
  setLaunchTab: (value: LaunchTab) => void;
};

/**
 * 启动主 Tab 偏好（设备级，登出不清除）
 */
export const useAppLaunchPrefsStore = create<AppLaunchPrefsState>((set) => ({
  launchTab: readLaunchTab(),
  setLaunchTab: (value) => {
    appStorage.set(LAUNCH_TAB_KEY, value);
    set({ launchTab: value });
  },
}));
