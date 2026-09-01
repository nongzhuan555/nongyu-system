import { useEffect, useRef, useState } from "react";
import { Dimensions, Keyboard, Platform, type KeyboardEvent } from "react-native";

/** 输入条与键盘上沿之间的呼吸间距 */
const KEYBOARD_GAP = 8;
/** 窗口相对弹键盘前缩短超过该比例，视为 adjustResize 已真正生效 */
const RESIZE_SHRINK_RATIO = 0.35;

function readKeyboardHeight(e: KeyboardEvent): number {
  const { height, screenY } = e.endCoordinates;
  if (typeof height === "number" && height > 0) return Math.round(height);
  const winH = Dimensions.get("window").height;
  if (typeof screenY === "number") return Math.max(0, Math.round(winH - screenY));
  return 0;
}

/**
 * 底部固定输入条相对屏幕底的垫高。
 *
 * Android 不能只看 `screenY`（resize 未生效时 cover≈0）也不能盲信全高 `height`
 * （resize 已生效时会双重顶起）。以「弹键盘前后 window.height 是否明显缩短」区分：
 * - 已缩短：窗口布局已上移，仅留呼吸间距；
 * - 未缩短：与 AI 页一致，按键盘高度垫高。
 */
export function useComposerKeyboardInset(safeBottom: number): number {
  const [keyboardInset, setKeyboardInset] = useState(0);
  const baselineWinHRef = useRef(Dimensions.get("window").height);

  useEffect(() => {
    const syncBaseline = () => {
      baselineWinHRef.current = Dimensions.get("window").height;
    };

    const apply = (e: KeyboardEvent) => {
      const kbH = readKeyboardHeight(e);

      if (Platform.OS === "ios") {
        setKeyboardInset(kbH + KEYBOARD_GAP);
        return;
      }

      const winH = Dimensions.get("window").height;
      const shrink = Math.max(0, baselineWinHRef.current - winH);
      const resizeEffective =
        kbH > 0 && shrink >= Math.min(kbH * RESIZE_SHRINK_RATIO, Math.max(kbH - 24, 0));

      setKeyboardInset(resizeEffective ? KEYBOARD_GAP : kbH + KEYBOARD_GAP);
    };

    const clear = () => {
      setKeyboardInset(0);
      syncBaseline();
    };

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const subs = [Keyboard.addListener(showEvent, apply), Keyboard.addListener(hideEvent, clear)];
    if (Platform.OS === "ios") {
      subs.push(Keyboard.addListener("keyboardWillChangeFrame", apply));
    }

    const dimSub = Dimensions.addEventListener("change", syncBaseline);

    return () => {
      subs.forEach((s) => s.remove());
      dimSub.remove();
    };
  }, []);

  return keyboardInset > 0 ? keyboardInset : safeBottom;
}
