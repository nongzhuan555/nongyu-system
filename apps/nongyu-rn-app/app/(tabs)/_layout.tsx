import { StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { BlurTargetProvider, BlurTargetSurface } from "@/components/navigation/BlurTargetContext";
import { FloatingTabBar } from "@/components/navigation/FloatingTabBar";
import { useThemeTokens } from "@/theme/ThemeProvider";

/** 与 src/modules 目录命名对齐：home / course / center / mine */
export const unstable_settings = {
  initialRouteName: "home",
};

/**
 * 主 Tab 容器：Provider 同时包住页面与底栏，Surface 只包页面作采样目标
 */
export default function TabsLayout() {
  const theme = useThemeTokens();

  return (
    <BlurTargetProvider>
      <View style={styles.root}>
        <BlurTargetSurface>
          <Tabs
            tabBar={() => null}
            screenOptions={{
              headerShown: false,
              sceneStyle: {
                backgroundColor: theme.color.background,
              },
            }}
          >
            <Tabs.Screen name="index" options={{ href: null }} />
            <Tabs.Screen name="home" options={{ title: "首页" }} />
            <Tabs.Screen name="course" options={{ title: "课表" }} />
            <Tabs.Screen name="center" options={{ title: "广场" }} />
            <Tabs.Screen name="mine" options={{ title: "我的" }} />
          </Tabs>
        </BlurTargetSurface>
        <FloatingTabBar />
      </View>
    </BlurTargetProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
