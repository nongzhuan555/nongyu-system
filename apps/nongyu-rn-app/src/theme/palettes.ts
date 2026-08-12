/**
 * v3 RN 主题色板数据（仅数据，不含切换逻辑）
 * 来源：old-code/nongyu/src/theme/index.ts
 */

export type BrandName = "green" | "sakura";

/** 品牌色板：MD3 关键色 + elevation */
export type BrandPalette = {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  tertiary: string;
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  outline: string;
  elevation: {
    level0: string;
    level1: string;
    level2: string;
    level3: string;
    level4: string;
    level5: string;
  };
};

/** 暗色模式表面/文字/描边覆盖（品牌主色仍取当前 brand） */
export type DarkSurfacePalette = {
  background: string;
  surface: string;
  surfaceVariant: string;
  onBackground: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
};

export const brandPalettes: Record<BrandName, BrandPalette> = {
  /** 川农新绿（默认） */
  green: {
    primary: "#0A7C59",
    onPrimary: "#FFFFFF",
    primaryContainer: "#D4E9DF",
    onPrimaryContainer: "#042116",
    secondary: "#2E7D6E",
    onSecondary: "#FFFFFF",
    tertiary: "#8FBF9B",
    background: "#FAFBFA",
    onBackground: "#111827",
    surface: "#FFFFFF",
    onSurface: "#1F2937",
    surfaceVariant: "#DEE5E1",
    onSurfaceVariant: "#424945",
    outline: "#CFE3DA",
    elevation: {
      level0: "transparent",
      level1: "#F3F6F4",
      level2: "#EDF2EF",
      level3: "#E6EEE9",
      level4: "#E0ECE5",
      level5: "#D9E7E0",
    },
  },
  /** 樱花浅粉 */
  sakura: {
    primary: "#FFB7C5",
    onPrimary: "#3A2A31",
    primaryContainer: "#FFD8E4",
    onPrimaryContainer: "#3E001D",
    secondary: "#F8BBD0",
    onSecondary: "#3A2A31",
    tertiary: "#FFE4EC",
    background: "#FFF9FB",
    onBackground: "#3A2A31",
    surface: "#FFFFFF",
    onSurface: "#3A2A31",
    surfaceVariant: "#F2DDE1",
    onSurfaceVariant: "#514347",
    outline: "#F4D8E3",
    elevation: {
      level0: "transparent",
      level1: "#FFF8F9",
      level2: "#FFF2F5",
      level3: "#FFEBF0",
      level4: "#FFE5EB",
      level5: "#FFDEE7",
    },
  },
};

/** v3 darkExtras 表面层 */
export const darkSurfacePalette: DarkSurfacePalette = {
  background: "#0B0F14",
  surface: "#121722",
  surfaceVariant: "#1A2230",
  onBackground: "#E6EAF0",
  onSurface: "#E6EAF0",
  onSurfaceVariant: "#C9D1DB",
  outline: "#2B3544",
  outlineVariant: "#1F2835",
};

/** v3 无独立 danger，沿用骨架占位以保证现有用法 */
export const DANGER_COLOR = "#C62828";
