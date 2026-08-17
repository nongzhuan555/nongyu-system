import Toast from "react-native-toast-message";
import type { AppToastOptions, AppToastType } from "./types";

/** 各类型默认展示时长（与 Spec §4.2 一致） */
const DEFAULT_DURATION_MS: Record<AppToastType, number> = {
  success: 2500,
  error: 3500,
  info: 2500,
};

/**
 * 弹出 Toast；空标题直接忽略，避免无效浮层
 */
function show(type: AppToastType, title: string, options?: AppToastOptions) {
  const text1 = title.trim();
  if (!text1) return;

  const description = options?.description?.trim();
  const userOnPress = options?.onPress;
  Toast.show({
    type,
    text1,
    text2: description || undefined,
    position: "top",
    visibilityTime: options?.duration ?? DEFAULT_DURATION_MS[type],
    onPress: () => {
      // 优先触发业务回调；无论是否提供 onPress，点击后都关闭浮层
      userOnPress?.();
      Toast.hide();
    },
  });
}

/**
 * 全局 Toast API — 业务侧唯一入口
 */
export const toast = {
  success: (title: string, options?: AppToastOptions) => show("success", title, options),
  error: (title: string, options?: AppToastOptions) => show("error", title, options),
  info: (title: string, options?: AppToastOptions) => show("info", title, options),
  hide: () => Toast.hide(),
};
