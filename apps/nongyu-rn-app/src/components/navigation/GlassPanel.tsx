import { BlurView, type BlurViewProps } from "expo-blur";
import { createElement, type ComponentType, type ReactNode, type RefObject } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { lightTokens } from "@/theme/tokens";
import { useBlurTarget } from "./BlurTargetContext";

const NativeGlassBlur = BlurView as unknown as ComponentType<BlurViewProps>;

type GlassPanelProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 圆形 / 胶囊由外层决定 */
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * 真毛玻璃面板：BlurView + 霜面白膜
 * 目标偏毛：背后内容不可清晰辨认，仅能感到色块/光影变化
 */
export function GlassPanel({ children, style, contentStyle }: GlassPanelProps) {
  const blur = useBlurTarget();
  const blurTarget = blur?.targetRef ?? null;
  const blurEpoch = blur?.blurEpoch ?? 0;

  const blurProps: BlurViewProps = {
    intensity: lightTokens.tabBar.blurIntensity,
    tint: "default",
    blurMethod: "dimezisBlurViewSdk31Plus",
    blurReductionFactor: lightTokens.tabBar.blurReductionFactor,
    style: [styles.blur, style],
    ...(blurTarget ? { blurTarget } : {}),
  };

  return createElement(
    NativeGlassBlur,
    {
      // epoch>0 时 remount，确保 Android 能拿到 blurTarget node id
      key: `glass-${blurEpoch}`,
      ...blurProps,
    },
    <>
      <View style={styles.frost} pointerEvents="none" />
      <View style={[styles.content, contentStyle]} pointerEvents="box-none">
        {children}
      </View>
    </>,
  );
}

/**
 * 无 Blur 可用时的半透明回退（仅作兜底观感，不替代真模糊）
 * GlassPanel 在 blurMethod=none 时原生侧也会走半透明；此处不单独渲染
 */
export type GlassBlurTargetRef = RefObject<View | null>;

const styles = StyleSheet.create({
  blur: {
    overflow: "hidden",
    backgroundColor: "transparent",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: lightTokens.tabBar.glassBorder,
    ...Platform.select({
      ios: {
        shadowColor: lightTokens.tabBar.shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 16,
      },
      // Android elevation 易变成实心底，毛玻璃场景关掉
      android: {
        elevation: 0,
      },
      default: {},
    }),
  },
  content: {
    flex: 1,
  },
  frost: {
    ...StyleSheet.absoluteFill,
    backgroundColor: lightTokens.tabBar.glassFill,
  },
});
