import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import Toast from "react-native-toast-message";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toastConfig } from "./toastConfig";

const ENTER_MS = 260;
const EXIT_MS = 200;

/**
 * 全局 Toast Host：安全区偏移 + 自定义胶囊 + 减弱动态效果
 * 须挂在 SafeAreaProvider 之内
 */
export function AppToastHost() {
  const insets = useSafeAreaInsets();
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return (
    <Toast
      config={toastConfig}
      position="top"
      topOffset={insets.top + 14}
      visibilityTime={2500}
      onPress={() => Toast.hide()}
      animationConfig={{
        enter: { type: "timing", duration: reduceMotion ? 1 : ENTER_MS },
        exit: { type: "timing", duration: reduceMotion ? 1 : EXIT_MS },
      }}
    />
  );
}
