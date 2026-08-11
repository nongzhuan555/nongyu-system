import { createContext, useContext, type ReactNode, type RefObject } from "react";
import type { View } from "react-native";

/**
 * 向悬浮底栏提供 Android BlurTargetView 的 ref
 */
const BlurTargetContext = createContext<RefObject<View | null> | null>(null);

export function BlurTargetProvider({
  targetRef,
  children,
}: {
  targetRef: RefObject<View | null>;
  children: ReactNode;
}) {
  return <BlurTargetContext.Provider value={targetRef}>{children}</BlurTargetContext.Provider>;
}

/** 读取毛玻璃模糊目标；未挂载 Provider 时返回 null */
export function useBlurTargetRef(): RefObject<View | null> | null {
  return useContext(BlurTargetContext);
}
