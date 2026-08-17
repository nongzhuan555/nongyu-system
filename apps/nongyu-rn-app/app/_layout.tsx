import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { type ReactNode } from "react";
import * as SplashScreen from "expo-splash-screen";
import { AppProviders } from "@/providers/AppProviders";
import { lightTokens } from "@/theme/tokens";
import { useJiaowuBootstrap } from "@/modules/jiaowu/hooks/useJiaowuBootstrap";
import { useSecondBootstrap } from "@/modules/second/hooks/useSecondBootstrap";
import { AuthRoot } from "@/modules/auth/components/AuthRoot";
import { AppErrorBoundary, TelemetryHost, installCrashTracking } from "@/modules/telemetry";
import { AgentChatRuntimeHost } from "@/agent/chatRunner";
import { CourseWidgetSyncHost } from "@/modules/course/widget/CourseWidgetSyncHost";
import { PostRepliesPollerHost } from "@/modules/center/PostRepliesPollerHost";
import { WechatBootstrapHost } from "@/lib/wechat/WechatBootstrapHost";
import { CampusWeatherBootstrapHost } from "@/modules/weather/CampusWeatherBootstrapHost";

// 启动时注册 Agent 工具的内联渲染组件（Generative UI）
import "@/agent-ui/register";

void SplashScreen.preventAutoHideAsync();

/** 冷启动先落登录页，已登录由 AuthRoot replace 到首页 */
export const unstable_settings = {
  initialRouteName: "login",
};

// 开发态 HTTP 日志：生产构建 __DEV__ 为 false，整段不可达并由打包器剔除
if (__DEV__) {
  const { installDevHttpLogger } =
    require("@/debug/devHttpLogger") as typeof import("@/debug/devHttpLogger");
  installDevHttpLogger();
}

installCrashTracking();

/**
 * 在 Provider 内执行教务 / 二课冷启动恢复
 */
function SessionBootstrapGate({ children }: { children: ReactNode }) {
  useJiaowuBootstrap();
  useSecondBootstrap();
  return children;
}

/**
 * 根布局：Provider、冷启动、未登录门禁与导航栈
 */
export default function RootLayout() {
  return (
    <AppProviders>
      <AppErrorBoundary>
        <SessionBootstrapGate>
          <StatusBar style="dark" />
          <AuthRoot>
            <TelemetryHost />
            <WechatBootstrapHost />
            <CampusWeatherBootstrapHost />
            <AgentChatRuntimeHost />
            <CourseWidgetSyncHost />
            <PostRepliesPollerHost />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: lightTokens.color.brandMuted },
                headerTintColor: lightTokens.color.brand,
                contentStyle: { backgroundColor: lightTokens.color.background },
              }}
            >
              <Stack.Screen
                name="login"
                options={{ title: "登录", headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="ai"
                options={{
                  title: "农小屿",
                  headerShown: false,
                  animation: "fade",
                  animationDuration: 320,
                }}
              />
              <Stack.Screen name="home/notice" options={{ title: "公告", headerShown: false }} />
              <Stack.Screen
                name="home/jiaowu"
                options={{ title: "教务系统", headerShown: false }}
              />
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
              <Stack.Screen
                name="home/second"
                options={{ title: "二课系统", headerShown: false }}
              />
              <Stack.Screen
                name="home/second/login"
                options={{ title: "二课登录", headerShown: false }}
              />
              <Stack.Screen
                name="home/second/profile"
                options={{ title: "个人二课信息", headerShown: false }}
              />
              <Stack.Screen
                name="home/second/activities/index"
                options={{ title: "二课活动", headerShown: false }}
              />
              <Stack.Screen
                name="home/second/activities/[id]"
                options={{ title: "活动详情", headerShown: false }}
              />
              <Stack.Screen
                name="center/post/[id]"
                options={{ title: "帖子详情", headerShown: false }}
              />
              <Stack.Screen name="center/compose" options={{ title: "发帖", headerShown: false }} />
              <Stack.Screen name="web-viewer" options={{ title: "网页", headerShown: false }} />
              <Stack.Screen name="mine/posts" options={{ title: "我的帖子", headerShown: false }} />
              <Stack.Screen
                name="mine/replies"
                options={{ title: "留言与回复", headerShown: false }}
              />
              <Stack.Screen
                name="mine/profile"
                options={{ title: "个人信息", headerShown: false }}
              />
              <Stack.Screen
                name="mine/settings/index"
                options={{ title: "设置", headerShown: false }}
              />
              <Stack.Screen
                name="mine/settings/course"
                options={{ title: "课表设置", headerShown: false }}
              />
              <Stack.Screen
                name="mine/settings/web"
                options={{ title: "网页跳转", headerShown: false }}
              />
              <Stack.Screen
                name="mine/settings/theme"
                options={{ title: "主题与外观", headerShown: false }}
              />
              <Stack.Screen
                name="mine/settings/rain"
                options={{ title: "下雨特效", headerShown: false }}
              />
              <Stack.Screen
                name="mine/settings/launch"
                options={{ title: "启动页", headerShown: false }}
              />
              <Stack.Screen
                name="mine/settings/agent"
                options={{ title: "农屿 Agent", headerShown: false }}
              />
              <Stack.Screen
                name="mine/settings/version"
                options={{ title: "版本", headerShown: false }}
              />
            </Stack>
          </AuthRoot>
        </SessionBootstrapGate>
      </AppErrorBoundary>
    </AppProviders>
  );
}
