/**
 * 主题模块统一导出
 */
export {
  brandPalettes,
  darkPalette,
  darkSurfacePalette,
  DANGER_COLOR,
  type BrandName,
  type BrandPalette,
  type DarkSurfacePalette,
} from "./palettes";
export { resolveColorPalette, type ThemeColorTokens } from "./resolveColor";
export { buildThemeTokens, layoutTokens, type ThemeTokens } from "./buildThemeTokens";
export { lightTokens, syncCompatLightTokens } from "./tokens";
export { ThemeProvider, useThemeTokens } from "./ThemeProvider";
export { createThemedStyles } from "./createThemedStyles";
export { useThemePrefsStore, type ThemeAppearance } from "./themePrefsStore";
