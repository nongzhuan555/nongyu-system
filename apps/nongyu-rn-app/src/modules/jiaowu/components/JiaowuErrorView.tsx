import { Pressable, StyleSheet, Text, View } from "react-native";
import { createThemedStyles } from "@/theme/createThemedStyles";

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
  const styles = useStyles();
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

const useStyles = createThemedStyles((t) => ({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: t.space.xl,
    gap: t.space.sm,
  },
  title: {
    fontSize: t.fontSize.lg,
    fontWeight: "700",
    color: t.color.text,
  },
  message: {
    fontSize: t.fontSize.md,
    color: t.color.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  btn: {
    marginTop: t.space.sm,
    backgroundColor: t.color.brand,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.sm + 2,
    borderRadius: t.radius.md,
  },
  pressed: {
    opacity: 0.8,
  },
  btnText: {
    color: t.color.onBrand,
    fontWeight: "600",
    fontSize: t.fontSize.md,
  },
}));
