import { Linking } from "react-native";
import { router, type Href } from "expo-router";
import { toast } from "@/components/ui/toast";
import { useAppWebPrefsStore } from "@/modules/settings/store/appWebPrefsStore";

type OpenAppUrlOptions = {
  /** 失败 Toast 副文案 / WebView 顶栏标题 */
  label?: string;
  /** 强制应用内 WebView（忽略「网页跳转」偏好） */
  forceInApp?: boolean;
};

/**
 * 按「网页跳转」偏好打开外链：
 * - 应用内 / forceInApp → 自建 WebView 页 `/web-viewer`
 * - 否则 → 系统浏览器
 */
export async function openAppUrl(url: string, options?: OpenAppUrlOptions): Promise<void> {
  const label = options?.label?.trim() || undefined;
  const openWebInApp = options?.forceInApp === true || useAppWebPrefsStore.getState().openWebInApp;

  try {
    if (openWebInApp) {
      const href =
        `/web-viewer?url=${encodeURIComponent(url)}&title=${encodeURIComponent(label ?? "网页")}` as Href;
      router.push(href);
      return;
    }
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      toast.error("无法打开链接", label ? { description: label } : undefined);
      return;
    }
    await Linking.openURL(url);
  } catch {
    toast.error("打开失败", label ? { description: label } : undefined);
  }
}
