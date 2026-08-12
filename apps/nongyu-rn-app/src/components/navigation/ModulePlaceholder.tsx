import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { lightTokens } from "@/theme/tokens";

type ModulePlaceholderProps = {
  title: string;
  subtitle: string;
};

/**
 * 业务子页通用占位
 */
export function ModulePlaceholder({ title, subtitle }: ModulePlaceholderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + lightTokens.space.md }]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.button}>
        <Text style={styles.buttonText}>返回</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: lightTokens.space.lg,
    backgroundColor: lightTokens.color.background,
  },
  title: {
    fontSize: lightTokens.fontSize.xl,
    fontWeight: "700",
    color: lightTokens.color.brand,
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
    paddingVertical: lightTokens.space.md,
    borderRadius: lightTokens.radius.md,
  },
  buttonText: {
    color: lightTokens.color.onBrand,
    fontSize: lightTokens.fontSize.md,
    fontWeight: "600",
  },
});
