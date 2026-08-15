import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Appearance, useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useThemePrefsStore } from "./themePrefsStore";
import { buildThemeTokens, type ThemeTokens } from "./buildThemeTokens";
import { syncCompatLightTokens } from "./tokens";

const ThemeContext = createContext<ThemeTokens | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
};

/**
 * 根主题：读偏好 → 解析明暗 → 提供 tokens；同步兼容 lightTokens
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const brand = useThemePrefsStore((s) => s.brand);
  const appearance = useThemePrefsStore((s) => s.appearance);
  const systemScheme = useColorScheme();
  const [systemDark, setSystemDark] = useState(() => Appearance.getColorScheme() === "dark");

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemDark(colorScheme === "dark");
    });
    return () => sub.remove();
  }, []);

  const isDark =
    appearance === "dark" || (appearance === "system" && (systemScheme === "dark" || systemDark));

  const tokens = useMemo(() => buildThemeTokens(brand, isDark), [brand, isDark]);

  // 布局前同步兼容导出名；禁止写在默认参数里引用 hook 结果
  useLayoutEffect(() => {
    syncCompatLightTokens(tokens);
  }, [tokens]);

  return (
    <ThemeContext.Provider value={tokens}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * 当前主题 Token（须在 ThemeProvider 内）
 */
export function useThemeTokens(): ThemeTokens {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return buildThemeTokens("green", false);
  }
  return ctx;
}
