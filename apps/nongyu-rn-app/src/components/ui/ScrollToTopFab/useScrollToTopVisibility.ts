import { useCallback, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

/** 超过该滚动距离后显示回顶按钮 */
export const SCROLL_TO_TOP_SHOW_Y = 240;

type UseScrollToTopVisibilityOptions = {
  threshold?: number;
};

/**
 * 根据滚动偏移控制回顶 FAB 显隐（仅在跨越阈值时 setState）
 */
export function useScrollToTopVisibility(options?: UseScrollToTopVisibilityOptions) {
  const threshold = options?.threshold ?? SCROLL_TO_TOP_SHOW_Y;
  const [visible, setVisible] = useState(false);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const next = y > threshold;
      setVisible((prev) => (prev === next ? prev : next));
    },
    [threshold],
  );

  return { visible, onScroll };
}
