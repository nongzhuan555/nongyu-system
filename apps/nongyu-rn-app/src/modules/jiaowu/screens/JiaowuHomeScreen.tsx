import { useThemeTokens } from "@/theme/ThemeProvider";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { createThemedStyles } from "@/theme/createThemedStyles";
import { useSessionStore } from "@/stores/session";
import { JiaowuServiceList } from "@/modules/jiaowu/components/JiaowuServiceList";
import { JiaowuLoginForm } from "@/modules/jiaowu/components/JiaowuLoginForm";

/**
 * 教务首页：服务入口 + 未登录时页内登录表单（登出不在此页）
 */
export function JiaowuHomeScreen() {
  const styles = useStyles();
  const t = useThemeTokens();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const profile = useSessionStore((s) => s.profile);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回"
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={t.color.brand} />
        </Pressable>
        <Text style={styles.title}>教务系统</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isAuthenticated && profile ? (
          <View style={styles.profileCard}>
            <Text style={styles.profileName}>
              {profile.name || "同学"} · {profile.studentId}
            </Text>
            <Text style={styles.profileMeta} numberOfLines={1}>
              {[profile.college, profile.major, profile.className].filter(Boolean).join(" · ") ||
                "已登录教务"}
            </Text>
          </View>
        ) : null}

        <JiaowuServiceList isAuthenticated={isAuthenticated} />

        {!isAuthenticated ? <JiaowuLoginForm compact /> : null}
      </ScrollView>
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
    paddingVertical: t.space.sm,
    minHeight: 48,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: t.fontSize.lg,
    fontWeight: "700",
    color: t.color.brand,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  body: {
    flex: 1,
    paddingHorizontal: t.space.md,
    paddingBottom: t.space.xl,
  },
  profileCard: {
    marginBottom: t.space.md,
    padding: t.space.md,
    backgroundColor: t.color.brandMuted,
    borderRadius: t.radius.lg,
    gap: 4,
  },
  profileName: {
    fontSize: t.fontSize.md,
    fontWeight: "700",
    color: t.color.brand,
  },
  profileMeta: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
  },
}));
