import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { type ReactNode } from "react";
import { AppProviders } from "@/providers/AppProviders";
import { lightTokens } from "@/theme/tokens";
import { useJiaowuBootstrap } from "@/modules/jiaowu/hooks/useJiaowuBootstrap";

/**
 * 在 Provider 内执行教务冷启动恢复
 */
function JiaowuBootstrapGate({ children }: { children: ReactNode }) {
  useJiaowuBootstrap();
  return children;
}

/**
 * 根布局：挂载全局 Provider、教务冷启动恢复与导航栈
 */
export default function RootLayout() {
  return (
    <AppProviders>
      <JiaowuBootstrapGate>
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
          <Stack.Screen name="home/notice" options={{ title: "通知", headerShown: false }} />
          <Stack.Screen name="home/jiaowu" options={{ title: "教务系统", headerShown: false }} />
          <Stack.Screen
            name="home/jiaowu/notice"
            options={{ title: "教务通知", headerShown: false }}
          />
          <Stack.Screen
            name="home/jiaowu/competition"
            options={{ title: "竞赛通知", headerShown: false }}
          />
          <Stack.Screen
            name="home/jiaowu/progress"
            options={{ title: "学业进度", headerShown: false }}
          />
          <Stack.Screen
            name="home/jiaowu/score"
            options={{ title: "成绩查询", headerShown: false }}
          />
          <Stack.Screen
            name="home/jiaowu/rank"
            options={{ title: "专业排名", headerShown: false }}
          />
          <Stack.Screen
            name="home/jiaowu/exam"
            options={{ title: "考试安排", headerShown: false }}
          />
          <Stack.Screen
            name="home/jiaowu/plan"
            options={{ title: "培养方案", headerShown: false }}
          />
          <Stack.Screen name="home/second" options={{ title: "二课系统", headerShown: false }} />
          <Stack.Screen name="login" options={{ title: "登录", presentation: "modal" }} />
        </Stack>
      </JiaowuBootstrapGate>
    </AppProviders>
  );
}
