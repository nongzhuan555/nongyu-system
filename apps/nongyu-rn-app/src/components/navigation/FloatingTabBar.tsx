import { Ionicons } from "@expo/vector-icons";
import { BlurView, type BlurViewProps } from "expo-blur";
import { useRouter, useSegments, type Href } from "expo-router";
import { type ComponentType, type RefObject } from "react";
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { lightTokens } from "@/theme/tokens";
import { useBlurTargetRef } from "./BlurTargetContext";

/** React 19 下 class 组件类型与 JSX 不兼容时的兼容包装 */
const GlassBlur = BlurView as unknown as ComponentType<BlurViewProps>;

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

const tokens = lightTokens.tabBar;

/**
 * 悬浮底栏：左侧「农屿AI」圆钮 + 右侧毛玻璃胶囊 Tab
 */
export function FloatingTabBar() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const blurTargetRef = useBlurTargetRef();

  const activeTab = resolveActiveTab(segments);
  const capsuleWidth = (windowWidth - tokens.horizontalInset * 2) * tokens.capsuleWidthRatio;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.host,
        {
          paddingBottom: Math.max(insets.bottom, tokens.bottomGap),
          paddingHorizontal: tokens.horizontalInset,
        },
      ]}
    >
      <View style={styles.row} pointerEvents="box-none">
        <GlassCircleButton
          blurTargetRef={blurTargetRef}
          onPress={() => router.push("/ai" as Href)}
        />

        <View style={[styles.capsuleShell, { width: capsuleWidth }]}>
          <GlassBlur
            intensity={tokens.blurIntensity}
            tint="light"
            blurMethod="dimezisBlurViewSdk31Plus"
            {...(blurTargetRef ? { blurTarget: blurTargetRef } : {})}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.glassOverlay} pointerEvents="none" />
          <View style={styles.capsuleRow}>
            {TABS.map((tab) => {
              const focused = tab.key === activeTab;
              return (
                <Pressable
                  key={tab.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: focused }}
                  onPress={() => router.navigate(tab.href)}
                  style={styles.tabItem}
                >
                  <View
                    style={[
                      styles.iconDisc,
                      focused && {
                        backgroundColor: lightTokens.color.brand,
                      },
                    ]}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={tokens.iconSize}
                      color={focused ? lightTokens.color.onBrand : lightTokens.color.textSecondary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.label,
                      {
                        color: focused ? lightTokens.color.brand : lightTokens.color.textSecondary,
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

/**
 * 左侧圆形 AI 入口（文案占位）
 */
function GlassCircleButton({
  onPress,
  blurTargetRef,
}: {
  onPress: () => void;
  blurTargetRef: RefObject<View | null> | null;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="农屿AI"
      onPress={onPress}
      style={styles.aiShell}
    >
      <GlassBlur
        intensity={tokens.blurIntensity}
        tint="light"
        blurMethod="dimezisBlurViewSdk31Plus"
        {...(blurTargetRef ? { blurTarget: blurTargetRef } : {})}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glassOverlay} pointerEvents="none" />
      <Text style={styles.aiText} numberOfLines={2}>
        农屿AI
      </Text>
    </Pressable>
  );
}

/** 从 Expo Router segments 解析当前 Tab */
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
    justifyContent: "space-between",
    gap: tokens.aiGap,
  },
  aiShell: {
    width: tokens.aiSize,
    height: tokens.aiSize,
    borderRadius: tokens.aiSize / 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: tokens.glassBorder,
    ...Platform.select({
      ios: {
        shadowColor: tokens.shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  aiText: {
    fontSize: 11,
    fontWeight: "700",
    color: lightTokens.color.brand,
    textAlign: "center",
    lineHeight: 14,
    letterSpacing: 0.5,
  },
  capsuleShell: {
    height: tokens.height,
    borderRadius: lightTokens.radius.full,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: tokens.glassBorder,
    ...Platform.select({
      ios: {
        shadowColor: tokens.shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  glassOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: tokens.glassFill,
  },
  capsuleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 6,
  },
  iconDisc: {
    width: tokens.activeDiscSize,
    height: tokens.activeDiscSize,
    borderRadius: tokens.activeDiscSize / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: tokens.labelSize,
    fontWeight: "600",
  },
});
