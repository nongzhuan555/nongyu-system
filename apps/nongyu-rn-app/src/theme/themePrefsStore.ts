import { create } from "zustand";
import type { BrandName } from "@/theme/palettes";
import { appStorage, THEME_APPEARANCE_KEY, THEME_BRAND_KEY } from "@/storage/mmkv";

export type ThemeAppearance = "light" | "dark" | "system";

function readBrand(): BrandName {
  const raw = appStorage.getString(THEME_BRAND_KEY);
  if (raw === "sakura") return "sakura";
  return "green";
}

function readAppearance(): ThemeAppearance {
  const raw = appStorage.getString(THEME_APPEARANCE_KEY);
  if (raw === "dark" || raw === "system" || raw === "light") return raw;
  return "light";
}

type ThemePrefsState = {
  brand: BrandName;
  appearance: ThemeAppearance;
  setBrand: (brand: BrandName) => void;
  setAppearance: (appearance: ThemeAppearance) => void;
};

/**
 * 主题偏好（设备级，登出不清除）
 */
export const useThemePrefsStore = create<ThemePrefsState>((set) => ({
  brand: readBrand(),
  appearance: readAppearance(),
  setBrand: (brand) => {
    appStorage.set(THEME_BRAND_KEY, brand);
    set({ brand });
  },
  setAppearance: (appearance) => {
    appStorage.set(THEME_APPEARANCE_KEY, appearance);
    set({ appearance });
  },
}));
