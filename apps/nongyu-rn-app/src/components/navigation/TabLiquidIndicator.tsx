import { useThemeTokens } from "@/theme/ThemeProvider";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { createThemedStyles } from "@/theme/createThemedStyles";
import { GlassPanel } from "./GlassPanel";

export type TabIndicatorFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** 软弹簧：约 380–450ms 体感，可略过冲 */
const MOVE_SPRING = {
  damping: 16,
  stiffness: 168,
  mass: 0.78,
} as const;

const BOUNCE_UP = {
  damping: 11,
  stiffness: 320,
  mass: 0.45,
} as const;

type TabLiquidIndicatorProps = {
  frame: TabIndicatorFrame | null;
  /**
   * blur：真毛玻璃（仅 BlurTargetSurface 外侧，如底栏）
   * frost：模拟霜膜（页面内容区内，禁止嵌套 BlurView）
   */
  surface?: "blur" | "frost";
  /** frost 模式填充覆盖（分段轨已是 brandMuted 时，指示器宜用 surface） */
  frostFill?: string;
  frostBorder?: string;
};

/**
 * 选中 Tab 椭圆指示器：水平滑动 + 途中横向拉伸 + 落地轻弹（水滴感）
 * blur 模式与大栏 GlassPanel 为兄弟节点，禁止嵌套 BlurView
 */
export function TabLiquidIndicator({
  frame,
  surface = "blur",
  frostFill,
  frostBorder,
}: TabLiquidIndicatorProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  const left = useSharedValue(0);
  const top = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const targetLeft = useSharedValue(0);
  const bounceY = useSharedValue(0);
  const ready = useSharedValue(0);
  const placedRef = useRef(false);

  useEffect(() => {
    if (!frame || frame.width <= 0 || frame.height <= 0) return;

    if (!placedRef.current) {
      left.value = frame.x;
      top.value = frame.y;
      width.value = frame.width;
      height.value = frame.height;
      targetLeft.value = frame.x;
      ready.value = 1;
      placedRef.current = true;
      return;
    }

    targetLeft.value = frame.x;
    left.value = withSpring(frame.x, MOVE_SPRING);
    top.value = withSpring(frame.y, MOVE_SPRING);
    width.value = withSpring(frame.width, MOVE_SPRING);
    height.value = withSpring(frame.height, MOVE_SPRING);
    // 落地轻弹：先略上抬再回落
    bounceY.value = withSequence(withSpring(-2.8, BOUNCE_UP), withSpring(0, MOVE_SPRING));
  }, [frame, bounceY, height, left, ready, targetLeft, top, width]);

  // 位移越大拉伸越明显，到位后自然收回（水滴拉丝）
  const stretchX = useDerivedValue(() => {
    const dx = Math.abs(left.value - targetLeft.value);
    return 1 + Math.min(dx / 46, 0.4);
  });
  const stretchY = useDerivedValue(() => {
    const dx = Math.abs(left.value - targetLeft.value);
    return 1 - Math.min(dx / 46, 0.18);
  });

  const animatedStyle = useAnimatedStyle(() => {
    if (ready.value === 0) {
      return { opacity: 0 };
    }
    const sx = stretchX.value;
    const sy = stretchY.value;
    const w = width.value;
    return {
      opacity: 1,
      position: "absolute" as const,
      left: left.value,
      top: top.value + bounceY.value,
      width: w,
      height: height.value,
      transform: [{ scaleX: sx }, { scaleY: sy }],
      zIndex: 0,
    };
  });

  const tab = t.tabBar;
  const { brandMuted, brand, outline, surface: surfaceColor } = t.color;
  // 略透明：保留主题浅色可辨，同时透出底下光影（玻璃感）
  const blurGlassFill = hexToRgba(brandMuted, tab.activeGlassFillAlpha);
  const resolvedFrostFill = frostFill ?? surfaceColor;
  const resolvedFrostBorder = frostBorder ?? (outline || brand);

  return (
    <Animated.View pointerEvents="none" style={animatedStyle}>
      {surface === "frost" ? (
        <View
          style={[
            styles.pill,
            styles.frostPill,
            {
              backgroundColor: resolvedFrostFill,
              borderColor: resolvedFrostBorder,
            },
          ]}
        />
      ) : (
        <GlassPanel
          chrome="minimal"
          intensity={tab.activeBlurIntensity}
          blurReductionFactor={tab.activeBlurReductionFactor}
          glassFill={blurGlassFill}
          glassBorder={outline || brand}
          style={styles.pill}
        />
      )}
    </Animated.View>
  );
}

/** #RRGGBB → rgba()，供毛玻璃霜膜半透明 */
export function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.replace("#", "").trim();
  if (raw.length !== 6) return hex;
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const useStyles = createThemedStyles((t) => ({
  pill: {
    width: "100%",
    height: "100%",
    borderRadius: t.radius.full,
  },
  frostPill: {
    borderWidth: StyleSheet.hairlineWidth,
  },
}));
