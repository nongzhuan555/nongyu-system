import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurTargetView } from "expo-blur";

type BlurTargetContextValue = {
  /** 供 BlurView.blurTarget 使用 */
  targetRef: RefObject<View | null>;
  /**
   * BlurTarget 完成布局后递增；用作 BlurView 的 key，
   * 迫使在 target.current 就绪后重新挂载（expo-blur 仅在 mount 时读取 node handle）
   */
  blurEpoch: number;
  /** Surface 布局完成时回调 */
  onTargetLayout: () => void;
};

const BlurTargetContext = createContext<BlurTargetContextValue | null>(null);

/**
 * 提供 blurTarget ref；必须同时包住「采样目标」与「毛玻璃底栏」
 */
export function BlurTargetProvider({ children }: { children: ReactNode }) {
  const targetRef = useRef<View | null>(null);
  const [blurEpoch, setBlurEpoch] = useState(0);

  const onTargetLayout = useCallback(() => {
    if (!targetRef.current) return;
    // 仅首次就绪时 remount BlurView，避免布局抖动反复卸载
    setBlurEpoch((n) => (n === 0 ? 1 : n));
  }, []);

  const value = useMemo(
    () => ({ targetRef, blurEpoch, onTargetLayout }),
    [targetRef, blurEpoch, onTargetLayout],
  );

  return <BlurTargetContext.Provider value={value}>{children}</BlurTargetContext.Provider>;
}

/**
 * 包裹页面内容作为 Android 毛玻璃采样目标
 */
export function BlurTargetSurface({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const blur = useContext(BlurTargetContext);
  if (!blur) {
    return <View style={[styles.target, style]}>{children}</View>;
  }

  return createElement(
    BlurTargetView as unknown as typeof View,
    {
      ref: blur.targetRef,
      collapsable: false,
      style: [styles.target, style],
      onLayout: blur.onTargetLayout,
    },
    children,
  );
}

/**
 * 兼容旧用法：Provider + Surface 合一（外侧底栏拿不到 context，勿再用于 Tab Shell）
 */
export function BlurTargetRoot({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <BlurTargetProvider>
      <BlurTargetSurface style={style}>{children}</BlurTargetSurface>
    </BlurTargetProvider>
  );
}

/** 读取毛玻璃目标；未挂载时返回 null */
export function useBlurTarget(): Pick<BlurTargetContextValue, "targetRef" | "blurEpoch"> | null {
  const ctx = useContext(BlurTargetContext);
  if (!ctx) return null;
  return { targetRef: ctx.targetRef, blurEpoch: ctx.blurEpoch };
}

const styles = StyleSheet.create({
  target: {
    flex: 1,
  },
});
