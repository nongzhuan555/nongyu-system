import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { lightTokens } from "@/theme/tokens";
import { AI_TIP_DISMISS_LABEL, AI_TIP_TEXT } from "./useAiTipBubble";

type AiTipBubbleProps = {
  visible: boolean;
  /** 点击提示文案：进 AI */
  onPressTip: () => void;
  /** 点击「我知道了」：仅关闭 */
  onDismiss: () => void;
};

/**
 * 农屿 AI 引导气泡：位于圆钮上方，水平展开并与底栏 Tab 平行，尖角朝下指向圆钮
 *
 * 注意：父级 aiAnchor 仅约圆钮宽；Android 上绝对定位子视图若不给明确宽度，
 * 会吃到父宽导致文案被截断。
 */
export function AiTipBubble({ visible, onPressTip, onDismiss }: AiTipBubbleProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const translateY = useSharedValue(6);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
      scale.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.back(1.35)) });
      translateY.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
      return;
    }
    opacity.value = withTiming(0, { duration: 160, easing: Easing.in(Easing.quad) });
    scale.value = withTiming(0.94, { duration: 160, easing: Easing.in(Easing.quad) });
    translateY.value = withTiming(4, { duration: 160, easing: Easing.in(Easing.quad) });
  }, [visible, opacity, scale, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View pointerEvents={visible ? "box-none" : "none"} style={[styles.wrap, animStyle]}>
      <View style={styles.bubble}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={AI_TIP_TEXT}
          onPress={onPressTip}
          style={styles.tipHit}
        >
          <Text style={styles.text}>{AI_TIP_TEXT}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={AI_TIP_DISMISS_LABEL}
          onPress={onDismiss}
          style={styles.dismissBtn}
          hitSlop={6}
        >
          <Text style={styles.dismissText}>{AI_TIP_DISMISS_LABEL}</Text>
        </Pressable>
      </View>
      <View style={styles.arrow} pointerEvents="none" />
    </Animated.View>
  );
}

const ARROW = 8;

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    bottom: "100%",
    marginBottom: 8,
    zIndex: 40,
    // 明确宽度，避免被窄父级（AI 圆钮）卡住
    width: 288,
    alignItems: "flex-start",
  },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 10,
    backgroundColor: lightTokens.color.surface,
    borderRadius: lightTokens.radius.md,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lightTokens.color.outline,
    shadowColor: lightTokens.tabBar.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  tipHit: {
    flexShrink: 1,
    paddingVertical: 2,
  },
  text: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: lightTokens.color.text,
  },
  dismissBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: lightTokens.radius.sm,
    backgroundColor: lightTokens.color.brandMuted,
  },
  dismissText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    color: lightTokens.color.brand,
  },
  arrow: {
    alignSelf: "flex-start",
    marginLeft: 18,
    marginTop: -1,
    width: 0,
    height: 0,
    borderLeftWidth: ARROW,
    borderRightWidth: ARROW,
    borderTopWidth: ARROW + 2,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: lightTokens.color.surface,
  },
});
