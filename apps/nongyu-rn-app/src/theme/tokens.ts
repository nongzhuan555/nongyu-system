/**
 * 设计 Token（川农新绿默认主题）
 * 后续可扩展樱花浅粉 / 暗黑 / 跟随系统
 */
export const lightTokens = {
  color: {
    brand: "#2E7D32",
    brandMuted: "#E8F5E9",
    background: "#F7FBF7",
    surface: "#FFFFFF",
    text: "#1B1B1B",
    textSecondary: "#5F6B5F",
    border: "#D7E3D7",
    danger: "#C62828",
    /** 选中圆底上的图标色 */
    onBrand: "#FFFFFF",
  },
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
    /** 胶囊 / 正圆 */
    full: 999,
  },
  fontSize: {
    sm: 13,
    md: 16,
    lg: 20,
    xl: 24,
  },
  /** 悬浮底栏（玻璃拟态） */
  tabBar: {
    horizontalInset: 14,
    bottomGap: 8,
    aiSize: 58,
    aiGap: 10,
    capsuleWidthRatio: 0.7,
    height: 64,
    blurIntensity: 64,
    glassFill: "rgba(255, 255, 255, 0.55)",
    glassBorder: "rgba(255, 255, 255, 0.65)",
    shadowColor: "rgba(27, 43, 27, 0.18)",
    iconSize: 20,
    activeDiscSize: 36,
    labelSize: 10,
  },
} as const;

export type ThemeTokens = typeof lightTokens;
