import { Image, Platform } from "react-native";
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

type NativeWechatModule = {
  registerApp: (request: { appid: string; universalLink?: string }) => Promise<unknown>;
  isWechatInstalled: () => Promise<unknown>;
  shareWebpage: (request: ShareWebpageRequest) => Promise<unknown>;
  NativeWechatShareScene?: {
    WXSceneSession: number;
    WXSceneTimeline: number;
  };
};

/** 好友会话 */
const SCENE_SESSION = 0;
/** 朋友圈 */
const SCENE_TIMELINE = 1;

let wechatModule: NativeWechatModule | null | undefined;
let coverUrlCache: string | null = null;
let didRegister = false;

/**
 * 安全加载原生模块：Expo Go / 未 prebuild 时 requireNativeModule 会抛错
 */
function loadWechatModule(): NativeWechatModule | null {
  if (wechatModule !== undefined) return wechatModule;
  try {
    // 同步 require：原生缺失时 module 顶层会抛，须 catch 降级
    wechatModule = require("expo-native-wechat") as NativeWechatModule;
  } catch (error) {
    if (__DEV__) {
      console.log(
        "[WeChat] Native module not loaded (expected in Expo Go). Use a Dev Client build.",
        error,
      );
    }
    wechatModule = null;
  }
  return wechatModule;
}

function parseInstalledFlag(result: unknown): boolean {
  if (typeof result === "boolean") return result;
  if (result && typeof result === "object" && "data" in result) {
    const data = (result as { data: unknown }).data;
    if (typeof data === "boolean") return data;
    return Boolean(data);
  }
  return Boolean(result);
}

/** 原生微信模块是否可用 */
export function isWechatNativeAvailable(): boolean {
  return loadWechatModule() != null;
}

/**
 * 启动时注册微信 SDK；失败不阻断 App
 */
export async function registerWechatApp(): Promise<boolean> {
  if (didRegister) return true;
  const mod = loadWechatModule();
  if (!mod) return false;
  try {
    await mod.registerApp({
      appid: WECHAT_APP_ID,
      universalLink: WECHAT_UNIVERSAL_LINK,
    });
    didRegister = true;
    return true;
  } catch (error) {
    console.warn("[WeChat] registerApp failed:", error);
    return false;
  }
}

/** 是否安装微信客户端 */
export async function isWechatInstalled(): Promise<boolean> {
  const mod = loadWechatModule();
  if (!mod) return false;
  try {
    return parseInstalledFlag(await mod.isWechatInstalled());
  } catch (error) {
    console.warn("[WeChat] isWechatInstalled error:", error);
    return false;
  }
}

async function resolveShareCoverUrl(): Promise<string | undefined> {
  if (coverUrlCache) return coverUrlCache;
  try {
    const resolved = Image.resolveAssetSource(require("../../../assets/icon.png"));
    const uri = resolved?.uri;
    if (uri) {
      coverUrlCache = uri;
      return uri;
    }
  } catch {
    // 缩略图失败时仍可分享网页
  }
  return undefined;
}

export type WechatShareSceneKind = "session" | "timeline";

/**
 * 分享官网网页到微信好友或朋友圈
 */
export async function shareNongyuWebpage(scene: WechatShareSceneKind): Promise<void> {
  if (Platform.OS === "ios") {
    throw new Error(SHARE_IOS_WECHAT_UNSUPPORTED);
  }

  const mod = loadWechatModule();
  if (!mod) {
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
      ? (mod.NativeWechatShareScene?.WXSceneTimeline ?? SCENE_TIMELINE)
      : (mod.NativeWechatShareScene?.WXSceneSession ?? SCENE_SESSION);

  const coverUrl = await resolveShareCoverUrl();

  await mod.shareWebpage({
    title: SHARE_WEBPAGE_TITLE,
    description: SHARE_WEBPAGE_DESCRIPTION,
    webpageUrl: SHARE_WEBPAGE_URL,
    scene: sceneCode,
    coverUrl,
  });
}
