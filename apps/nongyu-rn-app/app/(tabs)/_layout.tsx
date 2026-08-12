import { StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { BlurTargetRoot } from "@/components/navigation/BlurTargetContext";
import { FloatingTabBar } from "@/components/navigation/FloatingTabBar";
import { lightTokens } from "@/theme/tokens";

/** 与 src/modules 目录命名对齐：home / course / center / mine */
export const unstable_settings = {
  initialRouteName: "home",
};

/**
 * 主 Tab 容器：页面在 BlurTarget 内，悬浮底栏在外侧采样毛玻璃
 */
export default function TabsLayout() {
  return (
    <View style={styles.root}>
      <BlurTargetRoot>
        <Tabs
          tabBar={() => null}
          screenOptions={{
            headerShown: false,
            sceneStyle: {
              backgroundColor: lightTokens.color.background,
            },
          }}
        >
          <Tabs.Screen name="index" options={{ href: null }} />
          <Tabs.Screen name="home" options={{ title: "首页" }} />
          <Tabs.Screen name="course" options={{ title: "课表" }} />
          <Tabs.Screen name="center" options={{ title: "广场" }} />
          <Tabs.Screen name="mine" options={{ title: "我的" }} />
        </Tabs>
      </BlurTargetRoot>
      <FloatingTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
