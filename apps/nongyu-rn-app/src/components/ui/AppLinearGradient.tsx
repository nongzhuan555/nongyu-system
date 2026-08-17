import { LinearGradient, type LinearGradientProps } from "expo-linear-gradient";
import { type ComponentType, type ReactElement } from "react";
import { View, type ViewProps } from "react-native";

type ExpoRuntime = {
  getViewConfig?: (
    moduleName: string,
    viewName?: string,
  ) => { validAttributes: Record<string, unknown> } | null;
};

/**
 * expo-modules-core：getViewConfig 为空时原生渐变未注册（常见于旧 dev-client）。
 * pending（桥未就绪）时仍尝试原生组件。
 */
function isExpoLinearGradientConfirmedMissing(): boolean {
  try {
    const expo = (globalThis as { expo?: ExpoRuntime }).expo;
    if (typeof expo?.getViewConfig !== "function") return false;
    return expo.getViewConfig("ExpoLinearGradient") == null;
  } catch {
    return true;
  }
}

const NativeAppLinearGradient = LinearGradient as unknown as ComponentType<LinearGradientProps>;

/** 原生模块确认缺失时的纯色兜底，避免首屏异常 */
function FallbackLinearGradient({
  colors,
  style,
  children,
  ...rest
}: LinearGradientProps): ReactElement {
  const backgroundColor =
    Array.isArray(colors) && colors.length > 0 ? String(colors[0]) : undefined;
  const viewProps = rest as ViewProps;
  return (
    <View {...viewProps} style={[style, backgroundColor ? { backgroundColor } : null]}>
      {children}
    </View>
  );
}

/**
 * React 19 下 LinearGradient class 与 JSX 类型不兼容的包装；
 * 并在 ExpoLinearGradient 未编入当前 dev-client 时安全降级。
 */
export function AppLinearGradient(props: LinearGradientProps): ReactElement {
  if (isExpoLinearGradientConfirmedMissing()) {
    return <FallbackLinearGradient {...props} />;
  }
  return <NativeAppLinearGradient {...props} />;
}
