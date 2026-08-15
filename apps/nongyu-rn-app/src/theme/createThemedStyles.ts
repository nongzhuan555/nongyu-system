import { useMemo } from "react";
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from "react-native";
import { useThemeTokens } from "./ThemeProvider";
import type { ThemeTokens } from "./buildThemeTokens";

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * 模块级注册：返回 hook，随主题重算 StyleSheet
 *
 * @example
 * const useStyles = createThemedStyles((t) => ({
 *   root: { backgroundColor: t.color.background },
 * }));
 * // 组件内：const styles = useStyles();
 */
export function createThemedStyles<T extends NamedStyles<T>>(
  factory: (theme: ThemeTokens) => T | NamedStyles<T>,
) {
  return function useThemedStyles(): T {
    const theme = useThemeTokens();
    return useMemo(() => StyleSheet.create(factory(theme)) as T, [theme]);
  };
}
