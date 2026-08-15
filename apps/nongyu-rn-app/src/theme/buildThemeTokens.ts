import type { BrandName } from "./palettes";
import { resolveColorPalette } from "./resolveColor";

/**
 * Hex → rgba（主题玻璃派生）
 */
export function themeHexToRgba(hex: string, alpha: number): string {
  const raw = hex.replace("#", "").trim();
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => `${c}${c}`)
          .join("")
      : raw;
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n) || full.length !== 6) {
    return `rgba(0, 0, 0, ${alpha})`;
  }
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** 与主题无关的布局量 */
export const layoutTokens = {
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
  tabBarBase: {
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
    activeBlurIntensity: 18,
    activeBlurReductionFactor: 1.7,
    activeGlassFillAlpha: 0.45,
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

export type ThemeTokens = {
  color: ReturnType<typeof resolveColorPalette>;
  space: (typeof layoutTokens)["space"];
  radius: (typeof layoutTokens)["radius"];
  fontSize: (typeof layoutTokens)["fontSize"];
  tabBar: (typeof layoutTokens)["tabBarBase"] & {
    glassFill: string;
    glassBorder: string;
    shadowColor: string;
    activeGlassFill: string;
    activeGlassBorder: string;
  };
};

/**
 * 按品牌 + 明暗构建完整 Design Token
 */
export function buildThemeTokens(brand: BrandName, isDark: boolean): ThemeTokens {
  const color = resolveColorPalette(brand, isDark);
  const alpha = layoutTokens.tabBarBase.activeGlassFillAlpha;
  return {
    color,
    space: layoutTokens.space,
    radius: layoutTokens.radius,
    fontSize: layoutTokens.fontSize,
    tabBar: {
      ...layoutTokens.tabBarBase,
      glassFill: isDark ? "rgba(18, 23, 34, 0.55)" : "rgba(255, 255, 255, 0.10)",
      glassBorder: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.34)",
      shadowColor: isDark ? "rgba(0, 0, 0, 0.35)" : "rgba(27, 43, 27, 0.12)",
      activeGlassFill: themeHexToRgba(color.brandMuted, alpha),
      activeGlassBorder: themeHexToRgba(color.brand, 0.28),
    },
  };
}
