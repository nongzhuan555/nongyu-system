import type { ToastConfig } from "react-native-toast-message";
import { ToastCapsule } from "./ToastCapsule";
import type { AppToastType } from "./types";

/**
 * 将库参数渲染为统一胶囊（success / error / info）
 */
function renderCapsule(type: AppToastType) {
  return ({ text1, text2, onPress }: { text1?: string; text2?: string; onPress: () => void }) => (
    <ToastCapsule type={type} title={text1} description={text2} onPress={onPress} />
  );
}

/** 挂到 `<Toast config={toastConfig} />` */
export const toastConfig: ToastConfig = {
  success: renderCapsule("success"),
  error: renderCapsule("error"),
  info: renderCapsule("info"),
};
