import { useThemeTokens } from "@/theme/ThemeProvider";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createThemedStyles } from "@/theme/createThemedStyles";

type ModulePlaceholderProps = {
  title: string;
  subtitle: string;
};

/**
 * 业务子页通用占位
 */
export function ModulePlaceholder({ title, subtitle }: ModulePlaceholderProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + t.space.md }]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.button}>
        <Text style={styles.buttonText}>返回</Text>
      </Pressable>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  root: {
    flex: 1,
    paddingHorizontal: t.space.lg,
    backgroundColor: t.color.background,
  },
  title: {
    fontSize: t.fontSize.xl,
    fontWeight: "700",
    color: t.color.brand,
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
    paddingVertical: t.space.md,
    borderRadius: t.radius.md,
  },
  buttonText: {
    color: t.color.onBrand,
    fontSize: t.fontSize.md,
    fontWeight: "600",
  },
}));
