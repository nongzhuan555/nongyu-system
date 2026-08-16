import type { ReactNode } from "react";
import { Platform } from "react-native";
import { Pushy, UpdateProvider } from "react-native-update";
import updateJson from "../../../update.json";

type PushyPlatform = "ios" | "android";

type UpdateJson = Record<
  PushyPlatform,
  {
    appId: number;
    appKey: string;
  }
>;

/**
 * 从 update.json 按当前原生平台解析 appKey；无效则返回 null（不启用热更）
 */
function resolvePushyAppKey(): string | null {
  const os = Platform.OS;
  if (os !== "ios" && os !== "android") {
    return null;
  }
  const entry = (updateJson as UpdateJson)[os];
  const key = entry?.appKey?.trim();
  return key ? key : null;
}

const pushyAppKey = resolvePushyAppKey();

/** 模块级单例：全应用仅允许一个 UpdateProvider / 一个 Pushy 客户端 */
const pushyClient = pushyAppKey
  ? new Pushy({
      appKey: pushyAppKey,
      // 静默下载，下次冷启动生效
      updateStrategy: "silentAndLater",
      // 冷启动 + 从后台回前台均检查
      checkStrategy: "both",
    })
  : null;

/** 当前平台是否已配置有效 Pushy appKey（设置页据此决定是否挂 useUpdate） */
export const isPushyUpdateEnabled = pushyClient !== null;

type PushyUpdateProviderProps = {
  children: ReactNode;
};

/**
 * Pushy 热更新根 Provider。
 * appKey 缺失或非 ios/android 时直通 children，保证开发与未配置环境可启动。
 */
export function PushyUpdateProvider({ children }: PushyUpdateProviderProps) {
  if (!pushyClient) {
    return children;
  }
  return <UpdateProvider client={pushyClient}>{children}</UpdateProvider>;
}
