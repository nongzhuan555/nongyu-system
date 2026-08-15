import { useThemeTokens } from "@/theme/ThemeProvider";
import { useCallback, useMemo, useState } from "react";
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EntryCard } from "@/modules/home/components/EntryCard/EntryCard";
import { Greeting } from "@/modules/home/components/Greeting/Greeting";
import { NoticeBar } from "@/modules/home/components/NoticeBar/NoticeBar";
import { SocialCopyCard } from "@/modules/home/components/SocialCopyCard/SocialCopyCard";
import { WebNav } from "@/modules/home/components/WebNav/WebNav";
import { TabScreenBackground } from "@/components/navigation/TabScreenBackground";
import { createThemedStyles } from "@/theme/createThemedStyles";

/**
 * 社交卡与悬浮底栏重叠时的最低透明度（仍可辨认，但不与底栏抢视觉）
 * 各主 Tab 同类需求见 Spec《底部导航与App-Shell》§4.7
 */
const SOCIAL_OVERLAP_MIN_OPACITY = 0.34;

/**
 * 从「刚碰到底栏保护区」到「完全叠在底栏上」的渐隐行程（px）
 */
const SOCIAL_FADE_RANGE_PX = 56;

/**
 * 首页主界面组装
 */
export function HomeScreen() {
  const styles = useStyles();
  const t = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [scrollY, setScrollY] = useState(0);
  const [socialY, setSocialY] = useState(0);
  const [socialHeight, setSocialHeight] = useState(0);

  /**
   * 底栏视觉占用的屏幕顶部 Y：安全区 + 悬浮间距 + 底栏高度
   * 社交卡越过此线即开始让位降透明
   */
  const tabOverlayTop = useMemo(() => {
    const tab = t.tabBar;
    return windowHeight - (insets.bottom + tab.bottomGapMax + tab.heightMax + t.space.sm);
  }, [insets.bottom, t.space.sm, t.tabBar, windowHeight]);

  /**
   * 按社交卡底边进入底栏保护区的深度，插值透明度
   */
  const socialOpacity = useMemo(() => {
    if (socialHeight <= 0) return 1;
    const cardBottomOnScreen = socialY - scrollY + socialHeight;
    const overlap = cardBottomOnScreen - tabOverlayTop;
    if (overlap <= 0) return 1;
    const fade = Math.min(1, overlap / SOCIAL_FADE_RANGE_PX);
    return 1 - fade * (1 - SOCIAL_OVERLAP_MIN_OPACITY);
  }, [scrollY, socialHeight, socialY, tabOverlayTop]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollY(e.nativeEvent.contentOffset.y);
  }, []);

  const onSocialLayout = useCallback((e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    setSocialY(y);
    setSocialHeight(height);
  }, []);

  return (
    <View style={styles.root}>
      <TabScreenBackground />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + t.space.xs,
            paddingBottom: t.tabBar.heightMax + t.tabBar.bottomGapMax + t.space.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
        <Greeting />
        <NoticeBar />
        <WebNav />
        <EntryCard />
        <View onLayout={onSocialLayout}>
          <SocialCopyCard opacity={socialOpacity} />
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  root: {
    flex: 1,
    backgroundColor: t.color.background,
  },
  content: {
    paddingBottom: t.space.lg,
  },
}));
