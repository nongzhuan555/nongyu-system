import { Platform } from "react-native";
import {
  SHARE_IOS_WECHAT_UNSUPPORTED,
  SHARE_WEBPAGE_DESCRIPTION,
  SHARE_WEBPAGE_TITLE,
  SHARE_WEBPAGE_URL,
  WECHAT_APP_ID,
  WECHAT_UNIVERSAL_LINK,
} from "@/modules/mine/constants/share";

type ShareWebpageRequest = {
  title?: string;
  description?: string;
  scene: number;
  webpageUrl: string;
  coverUrl?: string;
};

type NativeWechatApi = {
  registerApp: (request: { appid: string; universalLink?: string }) => Promise<unknown> | void;
  isWechatInstalled: () => Promise<unknown>;
  shareWebpage: (request: ShareWebpageRequest) => Promise<unknown>;
  NativeWechatShareScene: {
    WXSceneSession: number;
    WXSceneTimeline: number;
  };
};

/** 好友会话 / 朋友圈（常量缺失时的兜底） */
const SCENE_SESSION = 0;
const SCENE_TIMELINE = 1;

/**
 * 缩略图必须是原生 OkHttp 可下载的 http(s)。
 * 本地 asset / file:// 会同步抛错 → Toast「ExpoNativeWechat.shareWebpage has been rejected」。
 */
const SHARE_COVER_URL = "http://nongyu.site/apple-touch-icon.png";

let wechatApi: NativeWechatApi | null | undefined;
let didRegister = false;

/**
 * 安全加载：Expo Go / 未 prebuild 时 requireNativeModule 会抛，须 catch 降级
 */
function loadWechatApi(): NativeWechatApi | null {
  if (wechatApi !== undefined) return wechatApi;
  try {
    wechatApi = require("expo-native-wechat") as NativeWechatApi;
  } catch (error) {
    if (__DEV__) {
      console.log(
        "[WeChat] Native module not loaded (expected in Expo Go). Use a Dev Client build.",
        error,
      );
    }
    wechatApi = null;
  }
  return wechatApi;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return null;
}

/** 库 Promise resolve 的是事件 payload；success === false 须当失败 */
function assertNativeOk(result: unknown, fallback: string): void {
  const rec = asRecord(result);
  if (!rec) return;
  if (rec.success === false || rec.success === 0) {
    const msg =
      (typeof rec.message === "string" && rec.message) ||
      (typeof rec.errorStr === "string" && rec.errorStr) ||
      fallback;
    throw new Error(msg);
  }
}

function formatShareError(err: unknown): string {
  if (!(err instanceof Error)) return "请稍后重试";
  const raw = err.message || "";
  if (/shareWebpage has been rejected/i.test(raw) || /has been rejected/i.test(raw)) {
    return "微信分享调用失败，请确认已安装微信后重试";
  }
  if (/Please register SDK/i.test(raw)) {
    return "微信 SDK 未注册，请重启 App 后重试";
  }
  return raw || "请稍后重试";
}

/** 原生微信模块是否可用 */
export function isWechatNativeAvailable(): boolean {
  return loadWechatApi() != null;
}

/**
 * 启动时注册微信 SDK；失败不阻断 App
 */
export async function registerWechatApp(): Promise<boolean> {
  if (didRegister) return true;
  const api = loadWechatApi();
  if (!api) return false;
  try {
    const result = await Promise.resolve(
      api.registerApp({
        appid: WECHAT_APP_ID,
        universalLink: WECHAT_UNIVERSAL_LINK,
      }),
    );
    assertNativeOk(result, "微信 SDK 注册失败");
    didRegister = true;
    return true;
  } catch (error) {
    console.warn("[WeChat] registerApp failed:", error);
    return false;
  }
}

/** 是否安装微信客户端 */
export async function isWechatInstalled(): Promise<boolean> {
  const api = loadWechatApi();
  if (!api) return false;
  try {
    const result = await api.isWechatInstalled();
    if (typeof result === "boolean") return result;
    const rec = asRecord(result);
    if (rec && "success" in rec) return Boolean(rec.success);
    if (rec && "data" in rec) return Boolean(rec.data);
    return Boolean(result);
  } catch (error) {
    console.warn("[WeChat] isWechatInstalled error:", error);
    return false;
  }
}

export type WechatShareSceneKind = "session" | "timeline";

/**
 * 分享官网网页到微信好友或朋友圈
 */
export async function shareNongyuWebpage(scene: WechatShareSceneKind): Promise<void> {
  if (Platform.OS === "ios") {
    throw new Error(SHARE_IOS_WECHAT_UNSUPPORTED);
  }

  const api = loadWechatApi();
  if (!api) {
    throw new Error("微信分享需使用 Dev Client 或正式包，当前环境未加载原生模块");
  }

  if (!didRegister) {
    const ok = await registerWechatApp();
    if (!ok) {
      throw new Error("微信 SDK 注册失败，请稍后重试");
    }
  }

  const installed = await isWechatInstalled();
  if (!installed) {
    throw new Error("未检测到微信客户端，请先安装");
  }

  const sceneCode =
    scene === "timeline"
      ? (api.NativeWechatShareScene?.WXSceneTimeline ?? SCENE_TIMELINE)
      : (api.NativeWechatShareScene?.WXSceneSession ?? SCENE_SESSION);

  const base = {
    title: SHARE_WEBPAGE_TITLE,
    description: SHARE_WEBPAGE_DESCRIPTION,
    webpageUrl: SHARE_WEBPAGE_URL,
    scene: sceneCode,
  };

  try {
    // 优先官网 http 缩略图；下载失败则无图再发（避免本地 URI 同步 rejected）
    try {
      const withCover = await api.shareWebpage({ ...base, coverUrl: SHARE_COVER_URL });
      assertNativeOk(withCover, "分享失败");
      return;
    } catch (coverErr) {
      if (__DEV__) {
        console.warn("[WeChat] share with cover failed, retry without cover:", coverErr);
      }
    }

    const bare = await api.shareWebpage(base);
    assertNativeOk(bare, "分享失败");
  } catch (err) {
    throw new Error(formatShareError(err));
  }
}
