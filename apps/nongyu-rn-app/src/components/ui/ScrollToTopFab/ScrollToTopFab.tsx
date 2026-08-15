import { useThemeTokens } from "@/theme/ThemeProvider";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { hexToRgba } from "@/components/navigation/TabLiquidIndicator";
import { createThemedStyles } from "@/theme/createThemedStyles";

const FAB_SIZE = 48;
const FADE_MS = 200;

type ScrollToTopFabProps = {
  visible: boolean;
  onPress: () => void;
  /**
   * tab：抬高避开悬浮底栏（广场 Tab）
   * stack：贴安全区底部（教务 / 二课 / 我的帖子等）
   */
  placement?: "tab" | "stack";
};

/**
 * 列表回顶霜膜圆钮（内容区内禁止真 BlurView）
 */
export function ScrollToTopFab({ visible, onPress, placement = "stack" }: ScrollToTopFabProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: FADE_MS });
  }, [opacity, visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const bottom =
    placement === "tab"
      ? t.tabBar.heightMax + t.tabBar.bottomGapMax + t.space.md
      : Math.max(insets.bottom, t.space.sm) + t.space.md;

  const fill = hexToRgba(t.color.surface, 0.78);
  const border = hexToRgba(t.color.brand, 0.22);

  return (
    <Animated.View
      style={[styles.wrap, { bottom, right: t.space.md }, animatedStyle]}
      pointerEvents={visible ? "box-none" : "none"}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="回到顶部并刷新"
        onPress={onPress}
        style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
      >
        <View style={[styles.frost, { backgroundColor: fill, borderColor: border }]}>
          <Ionicons name="chevron-up" size={22} color={t.color.brand} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const useStyles = createThemedStyles((t) => ({
  wrap: {
    position: "absolute",
    zIndex: 20,
  },
  hit: {
    width: FAB_SIZE,
    height: FAB_SIZE,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  frost: {
    flex: 1,
    borderRadius: t.radius.full,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
}));
