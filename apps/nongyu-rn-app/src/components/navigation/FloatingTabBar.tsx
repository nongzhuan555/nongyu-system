import { useThemeTokens } from "@/theme/ThemeProvider";
import { layoutTokens } from "@/theme/buildThemeTokens";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useSegments, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createThemedStyles } from "@/theme/createThemedStyles";
import { AiTipBubble } from "./AiTipBubble";
import { GlassPanel } from "./GlassPanel";
import { TabLiquidIndicator, type TabIndicatorFrame } from "./TabLiquidIndicator";
import { useAiTipBubble } from "./useAiTipBubble";
import { trackClick } from "@/modules/telemetry";

const NONGYU_AI_AVATAR = require("../../../assets/nongyuai.jpg");

/** 与 src/modules 目录命名对齐 */
type TabKey = "home" | "course" | "center" | "mine";

type TabItem = {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: Href;
};

type TabLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const TABS: TabItem[] = [
  {
    key: "home",
    label: "首页",
    icon: "home",
    href: "/(tabs)/home" as Href,
  },
  {
    key: "course",
    label: "课表",
    icon: "calendar",
    href: "/(tabs)/course" as Href,
  },
  {
    key: "center",
    label: "广场",
    icon: "compass",
    href: "/(tabs)/center" as Href,
  },
  {
    key: "mine",
    label: "我的",
    icon: "person",
    href: "/(tabs)/mine" as Href,
  },
];

const base = layoutTokens.tabBarBase;

type TabBarMetrics = {
  horizontalInset: number;
  bottomGap: number;
  aiGap: number;
  aiSize: number;
  height: number;
  iconSize: number;
  labelSize: number;
};

/**
 * 悬浮底栏：左侧「农屿AI」圆钮 + 右侧毛玻璃胶囊 Tab
 * 选中态：独立椭圆毛玻璃指示器（与大栏兄弟叠放）+ 水滴滑动动效
 */
export function FloatingTabBar() {
  const styles = useStyles();
  const t = useThemeTokens();
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const metrics = useMemo(() => resolveTabBarMetrics(windowWidth), [windowWidth]);
  const [tabLayouts, setTabLayouts] = useState<Partial<Record<TabKey, TabLayout>>>({});
  const { visible: tipVisible, hideTip, muteTip } = useAiTipBubble();

  const activeTab = resolveActiveTab(segments);
  const indicatorFrame = useMemo(
    () => resolveIndicatorFrame(tabLayouts[activeTab], metrics.height),
    [tabLayouts, activeTab, metrics.height],
  );

  const openAi = useCallback(() => {
    hideTip();
    trackClick("nongyu_ai");
    router.push("/ai" as Href);
  }, [hideTip, router]);

  const onTabLayout = useCallback((key: TabKey, event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setTabLayouts((prev) => {
      const cur = prev[key];
      if (cur && cur.x === x && cur.y === y && cur.width === width && cur.height === height) {
        return prev;
      }
      return { ...prev, [key]: { x, y, width, height } };
    });
  }, []);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.host,
        {
          paddingBottom: insets.bottom + metrics.bottomGap,
          paddingHorizontal: metrics.horizontalInset,
        },
      ]}
    >
      <View style={[styles.row, { gap: metrics.aiGap }]} pointerEvents="box-none">
        <View style={styles.aiAnchor}>
          <AiTipBubble
            visible={tipVisible}
            onPressTip={openAi}
            onMute={muteTip}
            onDismiss={hideTip}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="农屿AI" onPress={openAi}>
            <GlassPanel
              style={{
                width: metrics.aiSize,
                height: metrics.aiSize,
                borderRadius: metrics.aiSize / 2,
              }}
              contentStyle={styles.aiContent}
            >
              <Image
                source={NONGYU_AI_AVATAR}
                style={styles.aiAvatar}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
            </GlassPanel>
          </Pressable>
        </View>

        <View style={[styles.capsuleShell, { height: metrics.height }]}>
          <View style={styles.capsuleGlassHost} pointerEvents="none">
            <GlassPanel style={styles.capsuleGlass} />
          </View>
          <View style={styles.capsuleRow}>
            <TabLiquidIndicator frame={indicatorFrame} />
            {TABS.map((tab) => {
              const focused = tab.key === activeTab;
              const accent = focused ? t.color.brand : t.color.textSecondary;
              return (
                <Pressable
                  key={tab.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: focused }}
                  onPress={() => {
                    trackClick(`tab_${tab.key}`);
                    router.navigate(tab.href);
                  }}
                  onLayout={(e) => onTabLayout(tab.key, e)}
                  style={styles.tabItem}
                >
                  <Ionicons name={tab.icon} size={metrics.iconSize} color={accent} />
                  <Text
                    style={[
                      styles.label,
                      {
                        color: accent,
                        fontSize: metrics.labelSize,
                        lineHeight: metrics.labelSize,
                        fontWeight: focused ? "700" : "600",
                        // Android：去掉字下额外留白，避免选中椭圆观感下边距更大
                        includeFontPadding: false,
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

/** 按屏宽缩放底栏尺寸，并夹在合理区间内 */
function resolveTabBarMetrics(windowWidth: number): TabBarMetrics {
  const scale = clamp(windowWidth / base.baselineWidth, 0.88, 1.12);

  return {
    horizontalInset: clamp(
      windowWidth * base.horizontalInsetRatio,
      base.horizontalInsetMin,
      base.horizontalInsetMax,
    ),
    bottomGap: clamp(base.bottomGap * scale, base.bottomGapMin, base.bottomGapMax),
    aiGap: clamp(base.aiGap * scale, base.aiGapMin, base.aiGapMax),
    aiSize: clamp(base.aiSize * scale, base.aiSizeMin, base.aiSizeMax),
    height: clamp(base.height * scale, base.heightMin, base.heightMax),
    iconSize: clamp(base.iconSize * scale, base.iconSizeMin, base.iconSizeMax),
    labelSize: clamp(base.labelSize * scale, base.labelSizeMin, base.labelSizeMax),
  };
}

function resolveIndicatorFrame(
  layout: TabLayout | undefined,
  capsuleHeight: number,
): TabIndicatorFrame | null {
  if (!layout || layout.width <= 0 || capsuleHeight <= 0) return null;
  const insetV = base.activeInsetV;
  const insetH = base.activeInsetH;
  // 相对整条胶囊上下等距内缩，避免跟 Pressable 内容高度/字体边距耦合导致视觉不对称
  return {
    x: layout.x + insetH,
    y: insetV,
    width: Math.max(0, layout.width - insetH * 2),
    height: Math.max(0, capsuleHeight - insetV * 2),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveActiveTab(segments: string[]): TabKey {
  const last = segments[segments.length - 1];
  if (last === "home" || last === "course" || last === "center" || last === "mine") {
    return last;
  }
  return "home";
}

const useStyles = createThemedStyles((t) => ({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiAnchor: {
    position: "relative",
    zIndex: 30,
    overflow: "visible",
  },
  aiContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: t.radius.full,
  },
  aiAvatar: {
    width: "100%",
    height: "100%",
  },
  capsuleShell: {
    flex: 1,
    borderRadius: t.radius.full,
    overflow: "hidden",
  },
  capsuleGlassHost: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  capsuleGlass: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: t.radius.full,
  },
  capsuleRow: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "stretch",
    paddingHorizontal: 6,
    zIndex: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    zIndex: 2,
  },
  label: {
    fontWeight: "600",
  },
}));
