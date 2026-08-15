import { Pressable, StyleSheet, Text, View } from "react-native";
import { guestGreeting } from "@/modules/mine/constants/avatar";
import { createThemedStyles } from "@/theme/createThemedStyles";

type GuestPromptProps = {
  onPressLogin: () => void;
};

/**
 * 未登录引导：问候 + 去登录
 */
export function GuestPrompt({ onPressLogin }: GuestPromptProps) {
  const styles = useStyles();
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

const useStyles = createThemedStyles((t) => ({
  wrap: {
    marginTop: t.space.xl,
    paddingVertical: t.space.xl,
    paddingHorizontal: t.space.md,
    borderRadius: 24,
    backgroundColor: t.color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
  },
  greeting: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1.2,
    color: t.color.textSecondary,
    marginBottom: t.space.sm,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: t.color.text,
    marginBottom: t.space.sm,
  },
  subtitle: {
    fontSize: t.fontSize.md,
    color: t.color.textSecondary,
    lineHeight: 24,
    marginBottom: t.space.lg,
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: t.color.brand,
    paddingHorizontal: t.space.lg,
    paddingVertical: 12,
    borderRadius: t.radius.md,
  },
  pressed: {
    opacity: 0.88,
  },
  buttonText: {
    color: t.color.onBrand,
    fontSize: t.fontSize.md,
    fontWeight: "600",
  },
}));
