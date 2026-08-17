import { create } from "zustand";
import { appStorage, RAIN_EFFECT_ENABLED_KEY } from "@/storage/mmkv";

/** 预览期默认开启，方便直接验收观感；正式默认关闭可改为 false */
function readRainEnabled(): boolean {
  const raw = appStorage.getString(RAIN_EFFECT_ENABLED_KEY);
  if (raw === undefined) return true;
  return raw !== "0";
}

type RainPrefsState = {
  rainEnabled: boolean;
  setRainEnabled: (value: boolean) => void;
};

/**
 * 全局下雨特效偏好（设备级，登出不清除）
 */
export const useRainPrefsStore = create<RainPrefsState>((set) => ({
  rainEnabled: readRainEnabled(),
  setRainEnabled: (value) => {
    appStorage.set(RAIN_EFFECT_ENABLED_KEY, value ? "1" : "0");
    set({ rainEnabled: value });
  },
}));
