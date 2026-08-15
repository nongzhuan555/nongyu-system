import { type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { createThemedStyles } from "@/theme/createThemedStyles";

type SecondSurfaceProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
};

/**
 * 二课统一卡片面：细描边 + 极轻品牌阴影（高级简约）
 */
export function SecondSurface({ children, style, padded = true }: SecondSurfaceProps) {
  const styles = useStyles();
  return <View style={[styles.surface, padded && styles.padded, style]}>{children}</View>;
}

const useStyles = createThemedStyles((t) => ({
  surface: {
    borderRadius: t.radius.lg,
    backgroundColor: t.color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(10, 124, 89, 0.10)",
    shadowColor: t.color.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 1,
  },
  padded: {
    padding: t.space.md,
  },
}));
