import { useThemeTokens } from "@/theme/ThemeProvider";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabScreenBackground } from "@/components/navigation/TabScreenBackground";
import { toast } from "@/components/ui/toast";
import { openAppUrl } from "@/lib/openAppUrl";
import { GuestPrompt } from "@/modules/mine/components/GuestPrompt";
import { InfoGrid } from "@/modules/mine/components/InfoGrid";
import { ProfileHeader } from "@/modules/mine/components/ProfileHeader";
import { ServiceList } from "@/modules/mine/components/ServiceList";
import { ShareSheet } from "@/modules/mine/components/ShareSheet";
import { ABOUT_URL, buildServiceItems } from "@/modules/mine/constants/services";
import type { ServiceItem } from "@/modules/mine/constants/services";
import {
  buildAdminHandoffUrl,
  getAdminHandoffErrorMessage,
  requestAdminHandoff,
} from "@/modules/mine/data/adminHandoff";
import { trackClick } from "@/modules/telemetry";
import { useSessionStore } from "@/stores/session";
import { createThemedStyles } from "@/theme/createThemedStyles";

/**
 * 「我的」主界面：档案入口 + 服务；退出登录在设置页
 */
export function MineScreen() {
  const styles = useStyles();
  const t = useThemeTokens();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const profile = useSessionStore((s) => s.profile);
  const role = useSessionStore((s) => s.role);
  const [shareVisible, setShareVisible] = useState(false);
  const [adminOpening, setAdminOpening] = useState(false);

  const serviceItems = useMemo(() => buildServiceItems(role), [role]);
  const tabBarPad = t.tabBar.heightMax + t.tabBar.bottomGapMax + t.space.xl;

  const openSettings = () => {
    trackClick("mine_settings");
    router.push("/mine/settings" as Href);
  };

  const openAbout = () => {
    trackClick("mine_about");
    void openAppUrl(ABOUT_URL, { label: "农屿官网" });
  };

  const openAdminConsole = async () => {
    if (adminOpening) return;
    trackClick("mine_admin");
    setAdminOpening(true);
    try {
      const { ticket } = await requestAdminHandoff();
      const url = buildAdminHandoffUrl(ticket);
      await openAppUrl(url, { label: "农屿管理台" });
    } catch (error) {
      toast.error(getAdminHandoffErrorMessage(error));
    } finally {
      setAdminOpening(false);
    }
  };

  const handleServicePress = async (item: ServiceItem) => {
    const { action } = item;
    if (action.kind === "navigate") {
      if (item.key === "posts") trackClick("mine_posts");
      router.push(action.href);
      return;
    }
    if (action.kind === "share") {
      trackClick("share_open");
      setShareVisible(true);
      return;
    }
    if (action.kind === "admin") {
      await openAdminConsole();
      return;
    }
    await openAbout();
  };

  return (
    <View style={styles.root}>
      <TabScreenBackground />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + 10,
            paddingBottom: insets.bottom + tabBarPad,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader onPressSettings={openSettings} />

        {isAuthenticated && profile ? (
          <>
            <InfoGrid
              profile={profile}
              onPress={() => {
                trackClick("mine_profile");
                router.push("/mine/profile" as Href);
              }}
            />
            <ServiceList
              items={serviceItems}
              onPressItem={(item) => void handleServicePress(item)}
            />
          </>
        ) : (
          <>
            <GuestPrompt onPressLogin={() => router.push("/login")} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="关于农屿"
              onPress={() => void openAbout()}
              style={({ pressed }) => [styles.aboutLink, pressed && styles.aboutPressed]}
            >
              <Text style={styles.aboutLinkText}>关于农屿</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {adminOpening ? (
        <View style={styles.adminOverlay} pointerEvents="auto">
          <ActivityIndicator color={t.color.brand} />
          <Text style={styles.adminOverlayText}>正在打开管理台…</Text>
        </View>
      ) : null}

      <ShareSheet visible={shareVisible} onClose={() => setShareVisible(false)} />
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  root: {
    flex: 1,
    backgroundColor: t.color.background,
  },
  scroll: {
    paddingHorizontal: t.space.lg,
  },
  aboutLink: {
    marginTop: t.space.lg,
    alignSelf: "center",
    paddingVertical: t.space.sm,
    paddingHorizontal: t.space.md,
  },
  aboutPressed: {
    opacity: 0.75,
  },
  aboutLinkText: {
    fontSize: t.fontSize.md,
    color: t.color.brand,
    fontWeight: "600",
  },
  adminOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  adminOverlayText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
}));
