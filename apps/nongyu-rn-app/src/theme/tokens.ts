import { resolveColorPalette } from "./resolveColor";

/**
 * 设计 Token
 * 默认：川农新绿浅色（v3 色板）；樱花 / 暗色数据见 palettes，切换待设置页接入
 */
const layoutTokens = {
  space: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    full: 999,
  },
  fontSize: {
    sm: 13,
    md: 16,
    lg: 20,
    xl: 24,
  },
  /**
   * 悬浮底栏基准值（约 390 宽）
   * 毛玻璃目标：偏毛 —— 背后内容不可清晰辨认，仅能感到色块/光影变化
   */
  tabBar: {
    baselineWidth: 390,
    horizontalInsetRatio: 0.04,
    horizontalInsetMin: 12,
    horizontalInsetMax: 20,
    bottomGap: 16,
    bottomGapMin: 14,
    bottomGapMax: 22,
    aiGap: 6,
    aiGapMin: 4,
    aiGapMax: 8,
    aiSize: 56,
    aiSizeMin: 52,
    aiSizeMax: 64,
    height: 60,
    heightMin: 56,
    heightMax: 68,
    /** 高强度模糊（iOS intensity 越大越糊；取上限附近） */
    blurIntensity: 100,
    /** Android 模糊衰减，越小越糊；再压一档 */
    blurReductionFactor: 0.5,
    /** 霜面白膜：进一步压透视，背后仅留光影感 */
    glassFill: "rgba(255, 255, 255, 0.68)",
    glassBorder: "rgba(255, 255, 255, 0.72)",
    shadowColor: "rgba(27, 43, 27, 0.18)",
    iconSize: 22,
    iconSizeMin: 20,
    iconSizeMax: 24,
    labelSize: 10,
    labelSizeMin: 9,
    labelSizeMax: 11,
  },
} as const;

export const tokens = {
  color: resolveColorPalette("green", false),
  ...layoutTokens,
};

/** 兼容现有 `import { lightTokens }`：等同默认川农新绿浅色 */
export const lightTokens = tokens;

export type ThemeTokens = typeof tokens;
