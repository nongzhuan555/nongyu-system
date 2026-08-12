/**
 * 主题模块统一导出（色板数据 + 解析 + 默认 token）
 */
export {
  brandPalettes,
  darkSurfacePalette,
  DANGER_COLOR,
  type BrandName,
  type BrandPalette,
  type DarkSurfacePalette,
} from "./palettes";
export { resolveColorPalette, type ThemeColorTokens } from "./resolveColor";
export { lightTokens, tokens, type ThemeTokens } from "./tokens";
