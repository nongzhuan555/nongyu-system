import {
  type BrandName,
  type BrandPalette,
  DANGER_COLOR,
  brandPalettes,
  darkPalette,
} from "./palettes";

/**
 * 业务侧短字段（兼容现有 lightTokens.color.*）
 * 与 MD3 字段并存，便于后续主题切换直接复用
 */
export type ThemeColorTokens = BrandPalette & {
  outlineVariant?: string;
  brand: string;
  brandMuted: string;
  text: string;
  textSecondary: string;
  border: string;
  onBrand: string;
  danger: string;
};

function withShortAliases(
  palette: BrandPalette,
  extras?: { outlineVariant?: string },
): ThemeColorTokens {
  return {
    ...palette,
    outlineVariant: extras?.outlineVariant,
    brand: palette.primary,
    brandMuted: palette.primaryContainer,
    text: palette.onSurface,
    textSecondary: palette.onSurfaceVariant,
    border: palette.outline,
    onBrand: palette.onPrimary,
    danger: DANGER_COLOR,
  };
}

/**
 * 按品牌色与明暗解析完整 color token。
 * 暗色：忽略绿/粉品牌，固定使用 `darkPalette`（旧版 darkExtras 表面 + 统一冷灰蓝强调色）。
 */
export function resolveColorPalette(brand: BrandName, isDark: boolean): ThemeColorTokens {
  if (isDark) {
    return withShortAliases(darkPalette, { outlineVariant: darkPalette.outlineVariant });
  }

  return withShortAliases(brandPalettes[brand]);
}
