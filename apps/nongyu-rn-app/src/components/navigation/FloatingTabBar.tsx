import { Ionicons } from "@expo/vector-icons";
import { useRouter, useSegments, type Href } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { lightTokens } from "@/theme/tokens";
import { GlassPanel } from "./GlassPanel";

/** 与 src/modules 目录命名对齐 */
type TabKey = "home" | "course" | "center" | "mine";

type TabItem = {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: Href;
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

const base = lightTokens.tabBar;

type TabBarMetrics = {
  horizontalInset: number;
  bottomGap: number;
  aiGap: number;
  aiSize: number;
  height: number;
  iconSize: number;
  labelSize: number;
  aiFontSize: number;
};

/**
 * 悬浮底栏：左侧「农屿AI」圆钮 + 右侧毛玻璃胶囊 Tab
 */
export function FloatingTabBar() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const metrics = useMemo(() => resolveTabBarMetrics(windowWidth), [windowWidth]);

  const activeTab = resolveActiveTab(segments);

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="农屿AI"
          onPress={() => router.push("/ai" as Href)}
        >
          <GlassPanel
            style={{
              width: metrics.aiSize,
              height: metrics.aiSize,
              borderRadius: metrics.aiSize / 2,
            }}
            contentStyle={styles.aiContent}
          >
            <Text
              style={[
                styles.aiText,
                { fontSize: metrics.aiFontSize, lineHeight: metrics.aiFontSize + 3 },
              ]}
              numberOfLines={2}
            >
              农屿AI
            </Text>
          </GlassPanel>
        </Pressable>

        <GlassPanel
          style={[styles.capsule, { height: metrics.height }]}
          contentStyle={styles.capsuleRow}
        >
          {TABS.map((tab) => {
            const focused = tab.key === activeTab;
            const accent = focused ? lightTokens.color.brand : lightTokens.color.textSecondary;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                onPress={() => router.navigate(tab.href)}
                style={styles.tabItem}
              >
                <Ionicons name={tab.icon} size={metrics.iconSize} color={accent} />
                <Text
                  style={[
                    styles.label,
                    {
                      color: accent,
                      fontSize: metrics.labelSize,
                      fontWeight: focused ? "700" : "600",
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </GlassPanel>
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
    aiFontSize: clamp(11 * scale, 10, 12),
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

const styles = StyleSheet.create({
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
  aiContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  aiText: {
    fontWeight: "700",
    color: lightTokens.color.brand,
    textAlign: "center",
    letterSpacing: 0.4,
  },
  capsule: {
    flex: 1,
    borderRadius: lightTokens.radius.full,
  },
  capsuleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 8,
  },
  label: {
    fontWeight: "600",
  },
});
