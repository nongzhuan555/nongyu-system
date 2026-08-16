import { useThemeTokens } from "@/theme/ThemeProvider";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { confirm } from "@/components/ui/confirm";
import { hexToRgba } from "@/components/navigation/TabLiquidIndicator";
import { performJiaowuLogout } from "@/modules/jiaowu/auth/performJiaowuLogin";
import { formatLogoutConfirmMessage } from "@/modules/jiaowu/auth/logoutClearSummary";
import { useSessionStore } from "@/stores/session";
import { SettingsPageShell } from "../components/SettingsPageShell";
import { SettingsSectionList, type SettingsNavItem } from "../components/SettingsSectionList";
import { createThemedStyles } from "@/theme/createThemedStyles";

/**
 * 设置首页：分区入口 + 退出登录
 */
export function SettingsHomeScreen() {
  const styles = useStyles();
  const t = useThemeTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const items: SettingsNavItem[] = [
    {
      key: "course",
      title: "课表设置",
      description: "背景图、卡片大小、字体大小",
      available: true,
      onPress: () => router.push("/mine/settings/course" as Href),
    },
    {
      key: "web",
      title: "网页跳转",
      description: "内置浏览器或系统浏览器打开",
      available: true,
      onPress: () => router.push("/mine/settings/web" as Href),
    },
    {
      key: "theme",
      title: "主题与外观",
      description: "川农新绿、樱花、暗黑、跟随系统",
      available: true,
      onPress: () => router.push("/mine/settings/theme" as Href),
    },
    {
      key: "launch",
      title: "启动页",
      description: "打开 App 后进入首页或课表",
      available: true,
      onPress: () => router.push("/mine/settings/launch" as Href),
    },
    {
      key: "agent",
      title: "农屿 Agent",
      description: "服务商预设、API Key 与模型",
      available: true,
      onPress: () => router.push("/mine/settings/agent" as Href),
    },
    {
      key: "version",
      title: "版本",
      description: "查看版本并检查更新",
      available: true,
      onPress: () => router.push("/mine/settings/version" as Href),
    },
    {
      key: "feedback",
      title: "反馈与建议",
      description: "去农屿广场反馈墙",
      available: true,
      onPress: () => router.replace("/(tabs)/center?postType=feedback" as Href),
    },
  ];

  const handleLogout = async () => {
    if (logoutLoading) return;
    const ok = await confirm({
      title: "退出登录",
      message: formatLogoutConfirmMessage(),
      confirmText: "退出",
      destructive: true,
    });
    if (!ok) return;

    setLogoutLoading(true);
    try {
      await performJiaowuLogout(queryClient);
      toast.success("已退出登录");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "请稍后重试";
      toast.error("退出登录失败", { description: msg });
    } finally {
      setLogoutLoading(false);
    }
  };

  const frostFill = hexToRgba(t.color.surface, 0.55);
  const frostBorder = "rgba(220, 38, 38, 0.22)";
  const frostTint = "rgba(220, 38, 38, 0.08)";

  return (
    <SettingsPageShell title="设置" showBack>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + t.space.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSectionList items={items} />

        {isAuthenticated ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="退出登录"
            disabled={logoutLoading}
            onPress={() => void handleLogout()}
            style={({ pressed }) => [
              styles.logoutGlass,
              logoutLoading && styles.logoutDisabled,
              pressed && !logoutLoading && styles.logoutPressed,
            ]}
          >
            {/* 内容区霜膜拟态：勿嵌套真 BlurView */}
            <View
              pointerEvents="none"
              style={[styles.logoutFrost, { backgroundColor: frostFill, borderColor: frostBorder }]}
            />
            <View
              pointerEvents="none"
              style={[styles.logoutTint, { backgroundColor: frostTint }]}
            />
            <View style={styles.logoutContent}>
              {logoutLoading ? (
                <ActivityIndicator color={t.color.danger} />
              ) : (
                <>
                  <Ionicons name="log-out-outline" size={18} color={t.color.danger} />
                  <Text style={styles.logoutText}>退出登录</Text>
                </>
              )}
            </View>
          </Pressable>
        ) : null}
      </ScrollView>

      {logoutLoading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={t.color.onBrand} />
          <Text style={styles.loadingText}>正在退出...</Text>
        </View>
      ) : null}
    </SettingsPageShell>
  );
}

const useStyles = createThemedStyles((t) => ({
  content: {
    paddingTop: t.space.sm,
  },
  logoutGlass: {
    marginTop: t.space.xl,
    minHeight: 50,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutFrost: {
    ...StyleSheet.absoluteFill,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  logoutTint: {
    ...StyleSheet.absoluteFill,
    borderRadius: 16,
  },
  logoutContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: t.space.md,
    zIndex: 1,
  },
  logoutPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  logoutDisabled: {
    opacity: 0.7,
  },
  logoutText: {
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.danger,
    letterSpacing: 0.2,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  loadingText: {
    marginTop: t.space.md,
    color: "#fff",
    fontSize: t.fontSize.md,
    fontWeight: "500",
  },
}));
