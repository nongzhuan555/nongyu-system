import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";

const SPLASH_SOURCE = require("../../../../assets/splash-icon.jpg");

type BootSplashOverlayProps = {
  /** hydrate + 深链就绪后为 true，开始收起 JS 全屏闪屏 */
  ready: boolean;
};

/**
 * Android 12+ 系统启动屏无法铺满全屏图；原生层用同色空白图（见 app.json）先顶纯色，
 * 本组件 hide 原生后用 cover 全屏 splash 顶住，直到会话门禁就绪。
 */
export function BootSplashOverlay({ ready }: BootSplashOverlayProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (!ready || !visible) return;
    setVisible(false);
  }, [ready, visible]);

  if (!visible) return null;

  return (
    <View style={styles.root} pointerEvents="none">
      <Image source={SPLASH_SOURCE} style={styles.image} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: "#E8F5E9",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
