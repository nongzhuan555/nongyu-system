import { LinearGradient, type LinearGradientProps } from "expo-linear-gradient";
import { type ComponentType } from "react";

/**
 * React 19 下 LinearGradient class 与 JSX 类型不兼容的包装
 */
export const AppLinearGradient = LinearGradient as unknown as ComponentType<LinearGradientProps>;
