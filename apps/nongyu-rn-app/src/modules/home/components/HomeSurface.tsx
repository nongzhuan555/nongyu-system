import { type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { lightTokens } from "@/theme/tokens";

type HomeSurfaceProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 无内边距时由子元素自行控制（如网站栅格） */
  padded?: boolean;
};

/**
 * 首页统一浅浮层：大圆角 + 细描边 + 极轻品牌阴影
 */
export function HomeSurface({ children, style, padded = true }: HomeSurfaceProps) {
  return <View style={[styles.surface, padded && styles.padded, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: lightTokens.radius.lg,
    backgroundColor: lightTokens.color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(10, 124, 89, 0.08)",
    shadowColor: "#0A7C59",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 2,
  },
  padded: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
});
