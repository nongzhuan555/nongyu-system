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

/** 暗色表面字段（兼容旧导出；完整暗色见 darkPalette） */
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

/**
 * 固定深色色板（不区分绿/粉）。
 * 表面层取自旧版 darkExtras；强调色取同系冷灰蓝，避免再套品牌绿/粉。
 */
export const darkPalette: BrandPalette & { outlineVariant: string } = {
  primary: "#9BB8D3",
  onPrimary: "#0B0F14",
  primaryContainer: "#1F2835",
  onPrimaryContainer: "#E6EAF0",
  secondary: "#A8B5C4",
  onSecondary: "#0B0F14",
  tertiary: "#C9D1DB",
  background: "#0B0F14",
  onBackground: "#E6EAF0",
  surface: "#121722",
  onSurface: "#E6EAF0",
  surfaceVariant: "#1A2230",
  onSurfaceVariant: "#C9D1DB",
  outline: "#2B3544",
  outlineVariant: "#1F2835",
  elevation: {
    level0: "transparent",
    level1: "#121722",
    level2: "#151C28",
    level3: "#1A2230",
    level4: "#1E2836",
    level5: "#222E3C",
  },
};

/** v3 darkExtras 表面层（与 darkPalette 表面字段一致） */
export const darkSurfacePalette: DarkSurfacePalette = {
  background: darkPalette.background,
  surface: darkPalette.surface,
  surfaceVariant: darkPalette.surfaceVariant,
  onBackground: darkPalette.onBackground,
  onSurface: darkPalette.onSurface,
  onSurfaceVariant: darkPalette.onSurfaceVariant,
  outline: darkPalette.outline,
  outlineVariant: darkPalette.outlineVariant,
};

/** v3 无独立 danger，沿用骨架占位以保证现有用法 */
export const DANGER_COLOR = "#C62828";
