import { Platform } from "react-native";
import * as Application from "expo-application";
import * as Device from "expo-device";
import { newEventId } from "./ids";

/** 一次 JS 运行时一条会话，冷启动进程重建后更换 */
const sessionId = newEventId();

/**
 * 上报公共上下文（不含 user_id / Token）
 */
export function getTrackContext(): {
  session_id: string;
  app_version: string;
  platform?: "ios" | "android";
  device_brand?: string;
} {
  const os = Platform.OS;
  const platform = os === "ios" || os === "android" ? os : undefined;
  const brand = Device.brand?.trim();
  return {
    session_id: sessionId,
    app_version: Application.nativeApplicationVersion?.trim() || "0.0.0-dev",
    platform,
    device_brand: brand || undefined,
  };
}
