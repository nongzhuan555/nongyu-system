import { Pressable, StyleSheet, Text, View } from "react-native";
import { lightTokens } from "@/theme/tokens";

type JiaowuErrorViewProps = {
  message?: string;
  onRetry?: () => void;
};

/**
 * 教务加载失败态
 */
export function JiaowuErrorView({
  message = "加载失败，请检查网络后重试",
  onRetry,
}: JiaowuErrorViewProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>出错了</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
        >
          <Text style={styles.btnText}>重试</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: lightTokens.space.xl,
    gap: lightTokens.space.sm,
  },
  title: {
    fontSize: lightTokens.fontSize.lg,
    fontWeight: "700",
    color: lightTokens.color.text,
  },
  message: {
    fontSize: lightTokens.fontSize.md,
    color: lightTokens.color.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  btn: {
    marginTop: lightTokens.space.sm,
    backgroundColor: lightTokens.color.brand,
    paddingHorizontal: lightTokens.space.lg,
    paddingVertical: lightTokens.space.sm + 2,
    borderRadius: lightTokens.radius.md,
  },
  pressed: {
    opacity: 0.8,
  },
  btnText: {
    color: lightTokens.color.onBrand,
    fontWeight: "600",
    fontSize: lightTokens.fontSize.md,
  },
});
