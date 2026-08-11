import { BlurTargetView, type BlurTargetViewProps } from "expo-blur";
import { Tabs } from "expo-router";
import { useRef, type ComponentType, type Ref } from "react";
import { StyleSheet, View } from "react-native";
import { BlurTargetProvider } from "@/components/navigation/BlurTargetContext";
import { FloatingTabBar } from "@/components/navigation/FloatingTabBar";
import { lightTokens } from "@/theme/tokens";

/** React 19 下 class 组件类型与 JSX 不兼容时的兼容包装 */
const AndroidBlurTarget = BlurTargetView as unknown as ComponentType<
  BlurTargetViewProps & { ref?: Ref<View | null> }
>;

/** 与 src/modules 目录命名对齐：home / course / center / mine */
export const unstable_settings = {
  initialRouteName: "home",
};

/**
 * 主 Tab 容器：BlurTarget 包住页面，悬浮底栏在外侧以便毛玻璃采样
 */
export default function TabsLayout() {
  const blurTargetRef = useRef<View | null>(null);

  return (
    <BlurTargetProvider targetRef={blurTargetRef}>
      <View style={styles.root}>
        <AndroidBlurTarget ref={blurTargetRef} style={styles.blurTarget}>
          <Tabs
            tabBar={() => null}
            screenOptions={{
              headerShown: false,
              sceneStyle: {
                backgroundColor: lightTokens.color.background,
              },
            }}
          >
            <Tabs.Screen name="home" options={{ title: "首页" }} />
            <Tabs.Screen name="course" options={{ title: "课表" }} />
            <Tabs.Screen name="center" options={{ title: "广场" }} />
            <Tabs.Screen name="mine" options={{ title: "我的" }} />
          </Tabs>
        </AndroidBlurTarget>
        <FloatingTabBar />
      </View>
    </BlurTargetProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  blurTarget: {
    flex: 1,
  },
});
