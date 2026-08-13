import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { TabScreenBackground } from "@/components/navigation/TabScreenBackground";
import { performJiaowuLogout } from "@/modules/jiaowu/auth/performJiaowuLogin";
import { GuestPrompt } from "@/modules/mine/components/GuestPrompt";
import { IdentityCard } from "@/modules/mine/components/IdentityCard";
import { InfoGrid } from "@/modules/mine/components/InfoGrid";
import { ProfileHeader } from "@/modules/mine/components/ProfileHeader";
import { ServiceList } from "@/modules/mine/components/ServiceList";
import { ABOUT_URL } from "@/modules/mine/constants/services";
import type { ServiceItem } from "@/modules/mine/constants/services";
import { useSessionStore } from "@/stores/session";
import { lightTokens } from "@/theme/tokens";

/**
 * 「我的」主界面：已登录档案 + 服务入口；未登录引导去登录
 */
export function MineScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const profile = useSessionStore((s) => s.profile);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const tabBarPad =
    lightTokens.tabBar.heightMax + lightTokens.tabBar.bottomGapMax + lightTokens.space.xl;

  const openSettings = () => {
    router.push("/mine/settings" as Href);
  };

  const openAbout = async () => {
    try {
      await Linking.openURL(ABOUT_URL);
    } catch {
      toast.error("无法打开官网", { description: "请稍后重试" });
    }
  };

  const handleServicePress = async (item: ServiceItem) => {
    const { action } = item;
    if (action.kind === "navigate") {
      router.push(action.href);
      return;
    }
    if (action.kind === "share") {
      toast.info("分享功能即将上线");
      return;
    }
    await openAbout();
  };

  const doLogout = async () => {
    if (logoutLoading) return;
    setLogoutLoading(true);
    try {
      await performJiaowuLogout(queryClient);
      toast.success("已退出登录");
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("退出登录", "确定要退出登录吗？退出后将清除本地教务会话与登录状态。", [
      { text: "取消", style: "cancel" },
      { text: "确定", style: "destructive", onPress: () => void doLogout() },
    ]);
  };

  return (
    <View style={styles.root}>
      <TabScreenBackground />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + tabBarPad,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader onPressSettings={openSettings} />

        {isAuthenticated && profile ? (
          <>
            <IdentityCard name={profile.name} studentId={profile.studentId} />
            <InfoGrid profile={profile} />
            <ServiceList onPressItem={(item) => void handleServicePress(item)} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="退出登录"
              disabled={logoutLoading}
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.logoutBtn,
                pressed && styles.logoutPressed,
                logoutLoading && styles.logoutDisabled,
              ]}
            >
              {logoutLoading ? (
                <ActivityIndicator color={lightTokens.color.danger} />
              ) : (
                <Text style={styles.logoutText}>退出登录</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <GuestPrompt onPressLogin={() => router.push("/login")} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="关于农屿"
              onPress={() => void openAbout()}
              style={({ pressed }) => [styles.aboutLink, pressed && styles.logoutPressed]}
            >
              <Text style={styles.aboutLinkText}>关于农屿</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {logoutLoading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={lightTokens.color.onBrand} />
          <Text style={styles.loadingText}>正在退出...</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: lightTokens.color.background,
  },
  scroll: {
    paddingHorizontal: lightTokens.space.lg,
  },
  logoutBtn: {
    marginTop: lightTokens.space.xl,
    marginBottom: lightTokens.space.md,
    paddingVertical: 14,
    borderRadius: lightTokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(220, 38, 38, 0.06)",
    minHeight: 48,
  },
  logoutPressed: {
    opacity: 0.85,
  },
  logoutDisabled: {
    opacity: 0.7,
  },
  logoutText: {
    fontSize: lightTokens.fontSize.md,
    fontWeight: "600",
    color: lightTokens.color.danger,
  },
  aboutLink: {
    marginTop: lightTokens.space.lg,
    alignSelf: "center",
    paddingVertical: lightTokens.space.sm,
    paddingHorizontal: lightTokens.space.md,
  },
  aboutLinkText: {
    fontSize: lightTokens.fontSize.md,
    color: lightTokens.color.brand,
    fontWeight: "600",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  loadingText: {
    marginTop: lightTokens.space.md,
    color: "#fff",
    fontSize: lightTokens.fontSize.md,
    fontWeight: "500",
  },
});
