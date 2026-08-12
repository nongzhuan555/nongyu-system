import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { lightTokens } from "@/theme/tokens";
import { useSessionStore } from "@/stores/session";
import { JiaowuServiceList } from "@/modules/jiaowu/components/JiaowuServiceList";
import { JiaowuLoginForm } from "@/modules/jiaowu/components/JiaowuLoginForm";
import { performJiaowuLogout } from "@/modules/jiaowu/auth/performJiaowuLogin";

/**
 * 教务首页：服务入口 + 未登录时页内登录表单
 */
export function JiaowuHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const profile = useSessionStore((s) => s.profile);

  const handleLogout = async () => {
    await performJiaowuLogout(queryClient);
    Toast.show({ type: "success", text1: "已退出登录" });
  };

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
          <Ionicons name="chevron-back" size={22} color={lightTokens.color.brand} />
        </Pressable>
        <Text style={styles.title}>教务系统</Text>
        {isAuthenticated ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="退出登录"
            onPress={handleLogout}
            hitSlop={8}
          >
            <Text style={styles.logout}>退出</Text>
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: lightTokens.color.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: lightTokens.space.sm,
    paddingVertical: lightTokens.space.sm,
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
    fontSize: lightTokens.fontSize.lg,
    fontWeight: "700",
    color: lightTokens.color.brand,
    textAlign: "center",
  },
  logout: {
    fontSize: lightTokens.fontSize.sm,
    color: lightTokens.color.danger,
    fontWeight: "600",
    width: 40,
    textAlign: "right",
  },
  headerSpacer: {
    width: 40,
  },
  body: {
    flex: 1,
    paddingHorizontal: lightTokens.space.md,
    paddingBottom: lightTokens.space.xl,
  },
  profileCard: {
    marginBottom: lightTokens.space.md,
    padding: lightTokens.space.md,
    backgroundColor: lightTokens.color.brandMuted,
    borderRadius: lightTokens.radius.lg,
    gap: 4,
  },
  profileName: {
    fontSize: lightTokens.fontSize.md,
    fontWeight: "700",
    color: lightTokens.color.brand,
  },
  profileMeta: {
    fontSize: lightTokens.fontSize.sm,
    color: lightTokens.color.textSecondary,
  },
});
