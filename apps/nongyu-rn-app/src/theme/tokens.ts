import { buildThemeTokens, type ThemeTokens } from "./buildThemeTokens";

/**
 * 默认川农新绿浅色；ThemeProvider 会 syncCompat 更新
 * 新代码请优先 useThemeTokens / createThemedStyles
 */
export const lightTokens: ThemeTokens = buildThemeTokens("green", false);

export type { ThemeTokens };

/**
 * ThemeProvider 同步兼容导出名（原地更新字段）
 */
export function syncCompatLightTokens(next: ThemeTokens): void {
  Object.assign(lightTokens.color, next.color);
  Object.assign(lightTokens.tabBar, next.tabBar);
}

export { buildThemeTokens } from "./buildThemeTokens";
