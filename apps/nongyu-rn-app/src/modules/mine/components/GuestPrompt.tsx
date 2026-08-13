import { Pressable, StyleSheet, Text, View } from "react-native";
import { guestGreeting } from "@/modules/mine/constants/avatar";
import { lightTokens } from "@/theme/tokens";

type GuestPromptProps = {
  onPressLogin: () => void;
};

/**
 * 未登录引导：问候 + 去登录
 */
export function GuestPrompt({ onPressLogin }: GuestPromptProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.greeting}>{guestGreeting()}</Text>
      <Text style={styles.title}>欢迎来到农屿</Text>
      <Text style={styles.subtitle}>登录后查看个人档案、帖子与更多服务</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="去登录"
        onPress={onPressLogin}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>去登录</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: lightTokens.space.xl,
    paddingVertical: lightTokens.space.xl,
    paddingHorizontal: lightTokens.space.md,
    borderRadius: 24,
    backgroundColor: lightTokens.color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lightTokens.color.border,
  },
  greeting: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1.2,
    color: lightTokens.color.textSecondary,
    marginBottom: lightTokens.space.sm,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: lightTokens.color.text,
    marginBottom: lightTokens.space.sm,
  },
  subtitle: {
    fontSize: lightTokens.fontSize.md,
    color: lightTokens.color.textSecondary,
    lineHeight: 24,
    marginBottom: lightTokens.space.lg,
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: lightTokens.color.brand,
    paddingHorizontal: lightTokens.space.lg,
    paddingVertical: 12,
    borderRadius: lightTokens.radius.md,
  },
  pressed: {
    opacity: 0.88,
  },
  buttonText: {
    color: lightTokens.color.onBrand,
    fontSize: lightTokens.fontSize.md,
    fontWeight: "600",
  },
});
