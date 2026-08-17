import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import {
  AppState,
  type AppStateStatus,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

/** 雨丝数量：视觉密度与流畅度折中 */
const DROP_COUNT = 22;
/** 固定涟漪槽，避免 setState 挂载/卸载 */
const RIPPLE_SLOTS = 5;
/** 着地涟漪概率：略降，抵消雨丝增多带来的 JS 压力 */
const RIPPLE_CHANCE = 0.18;

const RAIN_COLOR = "rgba(155, 188, 228, 0.58)";
const RIPPLE_BORDER = "rgba(150, 185, 225, 0.5)";

type DropSeed = {
  xRatio: number;
  length: number;
  thickness: number;
  durationMs: number;
  delayMs: number;
  impactRatio: number;
  drift: number;
  gapMs: number;
};

type RippleSpawnApi = {
  spawn: (x: number, y: number) => void;
};

/**
 * 伪随机种子：横向均匀铺开 + 抖动，少雨丝也更显密
 */
function makeDropSeed(index: number): DropSeed {
  const t = (index * 7919 + 104729) % 1000;
  const u = (index * 104729 + 7919) % 1000;
  const baseX = (index + 0.5) / DROP_COUNT;
  const jitter = ((t % 100) / 100 - 0.5) * (0.7 / DROP_COUNT);
  const xRatio = (((baseX + jitter) % 1) + 1) % 1;
  return {
    xRatio,
    // 更长雨丝 → 同屏留存时间更长，观感更密
    length: 16 + (u % 16),
    thickness: index % 5 === 0 ? 2.1 : 1.25,
    // 略加快下落 → 同屏同时可见条数更多
    durationMs: 780 + (t % 420),
    delayMs: (index * 83) % 1600,
    impactRatio: 0.7 + (u % 24) / 100,
    drift: ((t % 13) - 6) * 0.28,
    gapMs: 35 + (u % 70),
  };
}

type RainDropProps = {
  seed: DropSeed;
  width: number;
  height: number;
  active: boolean;
  /** 稀疏着地回调；内部已做概率过滤 */
  onImpact: (x: number, y: number) => void;
};

/**
 * 单条雨丝：下落在 UI 线程，循环重启走 JS（避免 worklet 递归 cycle 为 undefined）
 */
const RainDrop = memo(function RainDrop({ seed, width, height, active, onImpact }: RainDropProps) {
  const translateY = useSharedValue(-40);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);

  const startX = seed.xRatio * width;
  const impactY = seed.impactRatio * height;
  const endX = seed.drift * 10;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { translateX: translateX.value }],
    opacity: opacity.value,
  }));

  useEffect(() => {
    if (!active) {
      cancelAnimation(translateY);
      cancelAnimation(translateX);
      cancelAnimation(opacity);
      opacity.value = 0;
      return;
    }

    let alive = true;
    let restartTimer: ReturnType<typeof setTimeout> | undefined;
    let startTimer: ReturnType<typeof setTimeout> | undefined;

    const impactX = startX + endX;

    const onFallComplete = () => {
      if (!alive) return;
      opacity.value = 0;
      if (Math.random() < RIPPLE_CHANCE) {
        onImpact(impactX, impactY);
      }
      restartTimer = setTimeout(() => {
        if (!alive) return;
        fallOnce();
      }, seed.gapMs);
    };

    const fallOnce = () => {
      if (!alive) return;

      translateY.value = -40 - seed.length;
      translateX.value = 0;
      opacity.value = 0.72;

      translateX.value = withTiming(endX, {
        duration: seed.durationMs,
        easing: Easing.linear,
      });
      translateY.value = withTiming(
        impactY,
        { duration: seed.durationMs, easing: Easing.linear },
        (finished) => {
          if (!finished) return;
          runOnJS(onFallComplete)();
        },
      );
    };

    startTimer = setTimeout(fallOnce, seed.delayMs);

    return () => {
      alive = false;
      if (startTimer) clearTimeout(startTimer);
      if (restartTimer) clearTimeout(restartTimer);
      cancelAnimation(translateY);
      cancelAnimation(translateX);
      cancelAnimation(opacity);
      opacity.value = 0;
    };
  }, [
    active,
    endX,
    impactY,
    onImpact,
    opacity,
    seed.delayMs,
    seed.durationMs,
    seed.gapMs,
    seed.length,
    startX,
    translateX,
    translateY,
  ]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.drop,
        {
          left: startX,
          width: seed.thickness,
          height: seed.length,
          borderRadius: seed.thickness,
          backgroundColor: RAIN_COLOR,
        },
        animatedStyle,
      ]}
    />
  );
});

type RippleSlotProps = {
  slotRef: MutableRefObject<((x: number, y: number) => void) | null>;
};

/**
 * 固定涟漪槽：复用节点，只改 shared value，不触发 React 重渲染
 */
function RippleSlot({ slotRef }: RippleSlotProps) {
  const posX = useSharedValue(-9999);
  const posY = useSharedValue(-9999);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    slotRef.current = (x: number, y: number) => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      posX.value = x;
      posY.value = y;
      scale.value = 0.3;
      opacity.value = 0.6;
      scale.value = withTiming(1.65, { duration: 580, easing: Easing.out(Easing.cubic) });
      opacity.value = withTiming(0, { duration: 580, easing: Easing.out(Easing.quad) });
    };
    return () => {
      slotRef.current = null;
    };
  }, [opacity, posX, posY, scale, slotRef]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: posX.value },
      { translateY: posY.value },
      { scaleX: scale.value },
      { scaleY: scale.value * 0.42 },
    ],
  }));

  return <Animated.View pointerEvents="none" style={[styles.rippleRing, style]} />;
}

type RainOverlayProps = {
  enabled: boolean;
};

/**
 * 全局前景雨效（性能向）：少雨丝 + 涟漪对象池；循环在 JS 调度（兼容 Reanimated）
 */
export function RainOverlay({ enabled }: RainOverlayProps) {
  const { width, height } = useWindowDimensions();
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const slotRefs = useRef(
    Array.from({ length: RIPPLE_SLOTS }, () => ({
      current: null as ((x: number, y: number) => void) | null,
    })),
  );
  const cursorRef = useRef(0);
  const apiRef = useRef<RippleSpawnApi | null>(null);

  const seeds = useMemo(() => Array.from({ length: DROP_COUNT }, (_, i) => makeDropSeed(i)), []);

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      setAppActive(next === "active");
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    apiRef.current = {
      spawn: (x, y) => {
        const slots = slotRefs.current;
        const idx = cursorRef.current % RIPPLE_SLOTS;
        cursorRef.current += 1;
        slots[idx]?.current?.(x, y);
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, []);

  const active = enabled && appActive && width > 0 && height > 0;

  const onImpact = useCallback((x: number, y: number) => {
    apiRef.current?.spawn(x, y);
  }, []);

  if (!enabled) return null;

  return (
    <View
      pointerEvents="none"
      style={styles.root}
      collapsable={false}
      // 动画层合成提示；持续变化内容不宜 shouldRasterizeIOS
      {...(Platform.OS === "android" ? { renderToHardwareTextureAndroid: true } : {})}
    >
      {seeds.map((seed, index) => (
        <RainDrop
          key={index}
          seed={seed}
          width={width}
          height={height}
          active={active}
          onImpact={onImpact}
        />
      ))}
      {slotRefs.current.map((slotRef, index) => (
        <RippleSlot key={index} slotRef={slotRef} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  drop: {
    position: "absolute",
    top: 0,
  },
  rippleRing: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 26,
    height: 26,
    marginLeft: -13,
    marginTop: -13,
    borderRadius: 13,
    borderWidth: 1.1,
    borderColor: RIPPLE_BORDER,
    backgroundColor: "rgba(170, 200, 235, 0.06)",
  },
});
