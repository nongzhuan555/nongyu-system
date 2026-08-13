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
   * 毛玻璃：真模糊 + 薄霜 —— 看不清背后文字，但滚动时能明显感到底下色块/光影在变；忌做成实心白块
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
    aiSize: 52,
    aiSizeMin: 48,
    aiSizeMax: 58,
    height: 52,
    heightMin: 48,
    heightMax: 58,
    blurIntensity: 8,
    blurReductionFactor: 2.4,
    glassFill: "rgba(255, 255, 255, 0.10)",
    glassBorder: "rgba(255, 255, 255, 0.34)",
    shadowColor: "rgba(27, 43, 27, 0.12)",
    /** 选中椭圆：比大栏更糊；填充 = brandMuted × activeGlassFillAlpha */
    activeBlurIntensity: 18,
    activeBlurReductionFactor: 1.7,
    /** brandMuted 霜膜透明度：略透才有玻璃感，过低会发虚 */
    activeGlassFillAlpha: 0.45,
    activeGlassFill: "rgba(212, 233, 223, 0.45)",
    activeGlassBorder: "rgba(10, 124, 89, 0.28)",
    /** 选中椭圆相对右侧大胶囊的上下等距内缩；左右相对 Tab 格内缩 */
    activeInsetV: 5,
    activeInsetH: 4,
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
