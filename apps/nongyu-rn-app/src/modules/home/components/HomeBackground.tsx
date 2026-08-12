import { StyleSheet } from "react-native";
import { AppLinearGradient } from "@/components/ui/AppLinearGradient";
import { lightTokens } from "@/theme/tokens";

/**
 * 首页顶部柔渐变背景（无装饰图案）
 */
export function HomeBackground() {
  return (
    <AppLinearGradient
      pointerEvents="none"
      colors={[
        lightTokens.color.primaryContainer,
        "rgba(250, 251, 250, 0.92)",
        lightTokens.color.background,
      ]}
      locations={[0, 0.28, 0.55]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}
