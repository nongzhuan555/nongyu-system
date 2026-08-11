import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { lightTokens } from "@/theme/tokens";

const ENTER_MS = 320;
const ENTER_EASING = Easing.out(Easing.cubic);
const INITIAL_SCALE = 0.94;

/**
 * 农屿 AI 占位页：淡入 + 轻微放大进入
 */
export default function AiScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(INITIAL_SCALE);

  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: ENTER_MS,
      easing: ENTER_EASING,
    });
    scale.value = withTiming(1, {
      duration: ENTER_MS,
      easing: ENTER_EASING,
    });
  }, [opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <Text style={styles.title}>农屿 AI</Text>
        <Text style={styles.subtitle}>
          Agent 入口骨架占位。后续接入对话与工具能力；入口视觉（头像等）另行设计。
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>返回</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: lightTokens.color.background,
    paddingHorizontal: lightTokens.space.lg,
  },
  card: {
    flex: 1,
    paddingTop: lightTokens.space.xl,
  },
  title: {
    fontSize: lightTokens.fontSize.xl,
    color: lightTokens.color.brand,
    fontWeight: "700",
    marginBottom: lightTokens.space.sm,
  },
  subtitle: {
    fontSize: lightTokens.fontSize.md,
    color: lightTokens.color.textSecondary,
    lineHeight: 24,
    marginBottom: lightTokens.space.lg,
  },
  backButton: {
    alignSelf: "flex-start",
    backgroundColor: lightTokens.color.brand,
    paddingHorizontal: lightTokens.space.lg,
    paddingVertical: lightTokens.space.md,
    borderRadius: lightTokens.radius.md,
  },
  backText: {
    color: lightTokens.color.onBrand,
    fontSize: lightTokens.fontSize.md,
    fontWeight: "600",
  },
});
