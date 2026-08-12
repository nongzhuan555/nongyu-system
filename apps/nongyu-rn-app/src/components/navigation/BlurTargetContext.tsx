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
};

const BlurTargetContext = createContext<BlurTargetContextValue | null>(null);

/**
 * 包裹页面内容作为 Android 毛玻璃采样目标，并向底栏提供 ref / epoch
 */
export function BlurTargetRoot({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const targetRef = useRef<View | null>(null);
  const [blurEpoch, setBlurEpoch] = useState(0);

  const onLayout = useCallback(() => {
    if (!targetRef.current) return;
    // 仅首次就绪时 remount BlurView，避免布局抖动反复卸载
    setBlurEpoch((n) => (n === 0 ? 1 : n));
  }, []);

  const value = useMemo(() => ({ targetRef, blurEpoch }), [targetRef, blurEpoch]);

  return (
    <BlurTargetContext.Provider value={value}>
      {createElement(
        BlurTargetView as unknown as typeof View,
        {
          ref: targetRef,
          collapsable: false,
          style: [styles.target, style],
          onLayout,
        },
        children,
      )}
    </BlurTargetContext.Provider>
  );
}

/** 读取毛玻璃目标；未挂载时返回 null */
export function useBlurTarget(): BlurTargetContextValue | null {
  return useContext(BlurTargetContext);
}

const styles = StyleSheet.create({
  target: {
    flex: 1,
  },
});
