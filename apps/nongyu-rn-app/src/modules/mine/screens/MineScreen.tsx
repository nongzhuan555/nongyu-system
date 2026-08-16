import { useThemeTokens } from "@/theme/ThemeProvider";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabScreenBackground } from "@/components/navigation/TabScreenBackground";
import { openAppUrl } from "@/lib/openAppUrl";
import { GuestPrompt } from "@/modules/mine/components/GuestPrompt";
import { InfoGrid } from "@/modules/mine/components/InfoGrid";
import { ProfileHeader } from "@/modules/mine/components/ProfileHeader";
import { ServiceList } from "@/modules/mine/components/ServiceList";
import { ShareSheet } from "@/modules/mine/components/ShareSheet";
import { ABOUT_URL } from "@/modules/mine/constants/services";
import type { ServiceItem } from "@/modules/mine/constants/services";
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
  const [shareVisible, setShareVisible] = useState(false);

  const tabBarPad = t.tabBar.heightMax + t.tabBar.bottomGapMax + t.space.xl;

  const openSettings = () => {
    router.push("/mine/settings" as Href);
  };

  const openAbout = () => {
    void openAppUrl(ABOUT_URL, { label: "农屿官网" });
  };

  const handleServicePress = async (item: ServiceItem) => {
    const { action } = item;
    if (action.kind === "navigate") {
      router.push(action.href);
      return;
    }
    if (action.kind === "share") {
      trackClick("share_open");
      setShareVisible(true);
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
            <InfoGrid profile={profile} onPress={() => router.push("/mine/profile" as Href)} />
            <ServiceList onPressItem={(item) => void handleServicePress(item)} />
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
}));
