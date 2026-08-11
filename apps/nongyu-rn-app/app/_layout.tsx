import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppProviders } from "@/providers/AppProviders";
import { lightTokens } from "@/theme/tokens";

/**
 * 根布局：挂载全局 Provider 与导航栈
 */
export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: lightTokens.color.brandMuted },
          headerTintColor: lightTokens.color.brand,
          contentStyle: { backgroundColor: lightTokens.color.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="ai"
          options={{
            title: "农屿 AI",
            headerShown: false,
            animation: "fade",
            animationDuration: 320,
          }}
        />
        <Stack.Screen name="login" options={{ title: "登录", presentation: "modal" }} />
      </Stack>
    </AppProviders>
  );
}
