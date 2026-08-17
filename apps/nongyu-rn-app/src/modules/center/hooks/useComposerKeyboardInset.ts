import { useEffect, useState } from "react";
import { Dimensions, Keyboard, Platform, type KeyboardEvent } from "react-native";

/** 输入条与键盘上沿之间的呼吸间距 */
const KEYBOARD_GAP = 16;

/**
 * 从键盘事件估算「窗口底部被键盘盖住的高度」。
 * 部分 Android 机型 `height` 偏小，与 screenY 推算取较大值。
 */
function overlapFromEvent(e: KeyboardEvent): number {
  const { height, screenY } = e.endCoordinates;
  const winH = Dimensions.get("window").height;
  const screenH = Dimensions.get("screen").height;
  const fromWindow = winH - screenY;
  const fromScreen = screenH - screenY;
  return Math.max(0, height, fromWindow, fromScreen);
}

/**
 * 底部固定输入条相对屏幕底的垫高。
 * - 键盘收起：安全区 bottom。
 * - 键盘弹出：遮挡高度 + 间距；Android 再补 safeBottom（部分机型 height 不含手势条）。
 */
export function useComposerKeyboardInset(safeBottom: number): number {
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    const apply = (e: KeyboardEvent) => {
      const overlap = overlapFromEvent(e);
      // Android 上 height 常不含底部手势区，补 safeBottom 避免仍被挡住一截
      const androidNav = Platform.OS === "android" ? safeBottom : 0;
      setKeyboardInset(overlap + KEYBOARD_GAP + androidNav);
    };
    const clear = () => setKeyboardInset(0);

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const subs = [Keyboard.addListener(showEvent, apply), Keyboard.addListener(hideEvent, clear)];
    if (Platform.OS === "ios") {
      subs.push(Keyboard.addListener("keyboardWillChangeFrame", apply));
    }

    return () => {
      subs.forEach((s) => s.remove());
    };
  }, [safeBottom]);

  return keyboardInset > 0 ? keyboardInset : safeBottom;
}
