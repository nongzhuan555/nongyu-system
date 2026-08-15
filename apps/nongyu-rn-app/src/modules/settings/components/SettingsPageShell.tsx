import { useThemeTokens } from "@/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabScreenBackground } from "@/components/navigation/TabScreenBackground";
import { createThemedStyles } from "@/theme/createThemedStyles";

type SettingsPageShellProps = {
  title: string;
  children: ReactNode;
  /** 是否显示返回（子页 true） */
  showBack?: boolean;
};

/**
 * 设置相关页通用顶栏壳
 */
export function SettingsPageShell({ title, children, showBack = true }: SettingsPageShellProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.root}>
      <TabScreenBackground />
      <View style={[styles.header, { paddingTop: insets.top + t.space.xs }]}>
        {showBack ? (
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.backBtn}
            accessibilityLabel="返回"
          >
            <Ionicons name="chevron-back" size={24} color={t.color.text} />
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <Text style={styles.title}>{title}</Text>
        <View style={styles.backPlaceholder} />
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  root: {
    flex: 1,
    backgroundColor: t.color.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: t.space.sm,
    paddingBottom: t.space.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backPlaceholder: {
    width: 40,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: t.fontSize.lg,
    fontWeight: "700",
    color: t.color.text,
  },
  body: {
    flex: 1,
    paddingHorizontal: t.space.md,
  },
}));
