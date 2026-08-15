import { useThemeTokens } from "@/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { createThemedStyles } from "@/theme/createThemedStyles";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type BackToCurrentWeekFabProps = {
  visible: boolean;
  onPress: () => void;
  /** 相对屏幕顶部的偏移（对齐旧版 thisWeekBtn top≈64） */
  topOffset?: number;
};

/**
 * 非本周时回到当前周（对齐旧版右侧半圆 undo 按钮）
 */
export function BackToCurrentWeekFab({
  visible,
  onPress,
  topOffset = 64,
}: BackToCurrentWeekFabProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 160 });
  }, [opacity, visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      pointerEvents={visible ? "auto" : "none"}
      style={[styles.btn, { top: topOffset }, animStyle]}
      accessibilityRole="button"
      accessibilityLabel="回到本周"
    >
      <Ionicons name="return-up-back" size={22} color={t.color.onBrand} />
    </AnimatedPressable>
  );
}

const useStyles = createThemedStyles((t) => ({
  btn: {
    position: "absolute",
    right: 0,
    zIndex: 10,
    width: 48,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.color.brand,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
}));
