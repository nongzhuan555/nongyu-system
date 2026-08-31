import { useEffect, useState } from "react";
import { Dimensions, Keyboard, Platform, type KeyboardEvent } from "react-native";

/** 输入条与键盘上沿之间的呼吸间距（不宜过大） */
const KEYBOARD_GAP = 8;

/**
 * 键盘相对当前窗口底部的遮挡高度。
 * 优先用 endCoordinates.height；仅当其明显偏小时再用 window 推算兜底。
 * 不用 screen 高度推算，避免 edge-to-edge 下把导航条/状态栏算进垫高导致空隙过大。
 */
function overlapFromEvent(e: KeyboardEvent): number {
  const { height, screenY } = e.endCoordinates;
  if (typeof height === "number" && height > 0) {
    return height;
  }
  // 极少机型 height 为 0：用事件坐标相对窗口底估算
  const winH = Dimensions.get("window").height;
  if (typeof screenY === "number") {
    return Math.max(0, winH - screenY);
  }
  return 0;
}

/**
 * 底部固定输入条相对屏幕底的垫高。
 * - 键盘收起：安全区 bottom。
 * - iOS 键盘弹出：键盘高度 + 小间距（系统不 resize 窗口）。
 * - Android 键盘弹出：仅小间距。项目已用 adjustResize / softwareKeyboardLayoutMode，
 *   窗口已缩短，再按键盘全高 padding 会与系统避让叠加，出现「顶得过高」。
 */
export function useComposerKeyboardInset(safeBottom: number): number {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [iosKeyboardInset, setIosKeyboardInset] = useState(0);

  useEffect(() => {
    const apply = (e: KeyboardEvent) => {
      setKeyboardOpen(true);
      if (Platform.OS === "ios") {
        setIosKeyboardInset(overlapFromEvent(e) + KEYBOARD_GAP);
      }
    };
    const clear = () => {
      setKeyboardOpen(false);
      setIosKeyboardInset(0);
    };

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const subs = [Keyboard.addListener(showEvent, apply), Keyboard.addListener(hideEvent, clear)];
    if (Platform.OS === "ios") {
      subs.push(Keyboard.addListener("keyboardWillChangeFrame", apply));
    }

    return () => {
      subs.forEach((s) => s.remove());
    };
  }, []);

  if (!keyboardOpen) {
    return safeBottom;
  }

  if (Platform.OS === "ios") {
    return Math.max(iosKeyboardInset, KEYBOARD_GAP);
  }

  // Android：窗口已由系统 resize/pan，只留呼吸间距
  return KEYBOARD_GAP;
}
