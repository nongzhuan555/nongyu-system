import { useThemeTokens } from "@/theme/ThemeProvider";
import { StyleSheet } from "react-native";
import { AppLinearGradient } from "@/components/ui/AppLinearGradient";

/**
 * 主 Tab 页统一顶部柔渐变（首页 / 广场 / 我的 共用）
 * 色带与 stops 以首页为准，避免各页各自一套范围
 */
export function TabScreenBackground() {
  const t = useThemeTokens();
  const mid = t.color.surface === t.color.background ? t.color.brandMuted : t.color.surface;
  return (
    <AppLinearGradient
      pointerEvents="none"
      colors={[t.color.primaryContainer, mid, t.color.background]}
      locations={[0, 0.48, 0.78]}
      start={{ x: 0.08, y: 0 }}
      end={{ x: 0.75, y: 0.92 }}
      style={StyleSheet.absoluteFill}
    />
  );
}
