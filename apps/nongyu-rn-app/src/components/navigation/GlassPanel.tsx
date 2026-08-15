import { useThemeTokens } from "@/theme/ThemeProvider";
import { BlurView, type BlurViewProps } from "expo-blur";
import { createElement, type ComponentType, type ReactNode, type RefObject } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { createThemedStyles } from "@/theme/createThemedStyles";
import { useBlurTarget } from "./BlurTargetContext";

const NativeGlassBlur = BlurView as unknown as ComponentType<BlurViewProps>;

type GlassPanelProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 圆形 / 胶囊由外层决定 */
  contentStyle?: StyleProp<ViewStyle>;
  /** 覆盖默认模糊强度（选中指示器可更高） */
  intensity?: number;
  blurReductionFactor?: number;
  glassFill?: string;
  glassBorder?: string;
  /**
   * default：底栏大面（描边 + iOS 阴影）
   * minimal：选中椭圆等叠层（轻描边、无阴影），避免双层阴影发脏
   */
  chrome?: "default" | "minimal";
};

/**
 * 真毛玻璃面板：BlurView（磨砂）+ 薄霜白膜
 * - 要能感到底下滚动时的颜色/光影变化
 * - 不能看清背后文字，更不能做成实心不透明白块（霜膜务必薄，见 tokens.tabBar.glassFill）
 * - **禁止**放在 `BlurTargetSurface` 内部（Android 嵌套 BlurView 易原生闪退）；仅用于底栏等外侧叠层
 * - 多个 GlassPanel 必须为**兄弟节点**，禁止互相嵌套
 * - 默认玻璃色必须在函数体内用 useThemeTokens 解析，禁止写在形参默认值里（会引用未定义的 t）
 */
export function GlassPanel({
  children,
  style,
  contentStyle,
  intensity,
  blurReductionFactor,
  glassFill,
  glassBorder,
  chrome = "default",
}: GlassPanelProps) {
  const styles = useStyles();
  const theme = useThemeTokens();
  const resolvedIntensity = intensity ?? theme.tabBar.blurIntensity;
  const resolvedBlurReduction = blurReductionFactor ?? theme.tabBar.blurReductionFactor;
  const resolvedFill = glassFill ?? theme.tabBar.glassFill;
  const resolvedBorder = glassBorder ?? theme.tabBar.glassBorder;
  const blur = useBlurTarget();
  const blurTarget = blur?.targetRef ?? null;
  const blurEpoch = blur?.blurEpoch ?? 0;
  const isMinimal = chrome === "minimal";

  const blurProps: BlurViewProps = {
    intensity: resolvedIntensity,
    // extraLight：偏白磨砂，避免 light/default 发灰
    tint: "extraLight",
    blurMethod: "dimezisBlurViewSdk31Plus",
    blurReductionFactor: resolvedBlurReduction,
    style: [
      styles.blur,
      isMinimal ? styles.blurMinimal : styles.blurDefault,
      { borderColor: resolvedBorder },
      style,
    ],
    // Android 真模糊必须带上 BlurTargetView 的 ref
    ...(blurTarget ? { blurTarget } : {}),
  };

  return createElement(
    NativeGlassBlur,
    {
      // epoch>0 时 remount，确保 Android 能拿到 blurTarget node id
      key: `glass-${blurEpoch}-${resolvedIntensity}-${chrome}`,
      ...blurProps,
    },
    <>
      {/* 薄霜：只压锐度，不盖死模糊透色 */}
      <View style={[styles.frost, { backgroundColor: resolvedFill }]} pointerEvents="none" />
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

const useStyles = createThemedStyles((t) => ({
  blur: {
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  blurDefault: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    ...Platform.select({
      ios: {
        shadowColor: t.tabBar.shadowColor,
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
  blurMinimal: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flex: 1,
  },
  frost: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
}));
