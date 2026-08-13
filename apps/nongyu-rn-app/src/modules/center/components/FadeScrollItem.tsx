import { type ReactNode } from "react";
import Animated, {
  Extrapolation,
  interpolate,
  measure,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";

/** 不可见高度占比达到此值才开始渐隐 */
const FADE_START_HIDDEN_RATIO = 0.5;
/** 不可见达到此比例时已完全透明（早于 100%，终点更「透」） */
const FADE_FULL_HIDDEN_RATIO = 0.78;

type FadeScrollItemProps = {
  /** 列表 contentOffset.y */
  scrollY: SharedValue<number>;
  /** 列表容器在窗口中的 pageY */
  listPageY: SharedValue<number>;
  /** 1 = 用户正在滑动（含惯性），0 = 静止 */
  isScrolling: SharedValue<number>;
  children: ReactNode;
};

/**
 * 列表项顶部滚出渐隐：默认不透明；仅「滑动中 + ≥50% 高度不可见」时才变透明
 */
export function FadeScrollItem({ scrollY, listPageY, isScrolling, children }: FadeScrollItemProps) {
  const ref = useAnimatedRef<Animated.View>();
  const opacity = useSharedValue(1);

  useAnimatedReaction(
    () => scrollY.value + listPageY.value + isScrolling.value,
    () => {
      // 未在滑动：始终不透明（含首屏静止）
      if (isScrolling.value === 0) {
        opacity.value = 1;
        return;
      }

      const m = measure(ref);
      if (m === null || m.height <= 0) {
        opacity.value = 1;
        return;
      }

      const topInList = m.pageY - listPageY.value;
      // 顶部滚出量（仅计上沿越界）；下方未进屏不算「不可见」
      const hiddenAbove = Math.max(0, -topInList);
      const hiddenRatio = Math.min(1, hiddenAbove / m.height);

      if (hiddenRatio < FADE_START_HIDDEN_RATIO) {
        opacity.value = 1;
        return;
      }

      // 50% → 78% 不可见：不透明 → 全透明（终点更早、更透）
      opacity.value = interpolate(
        hiddenRatio,
        [FADE_START_HIDDEN_RATIO, FADE_FULL_HIDDEN_RATIO],
        [1, 0],
        Extrapolation.CLAMP,
      );
    },
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View ref={ref} collapsable={false} style={animatedStyle}>
      {children}
    </Animated.View>
  );
}
