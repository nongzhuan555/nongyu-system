import { useEffect, useState } from "react";
import { getAccessToken } from "nongyu-tool-second";

type Listener = () => void;
const listeners = new Set<Listener>();
let secondAuthed = false;

function emit() {
  for (const listener of listeners) listener();
}

/**
 * 根据工具内存 token 刷新二课登录态
 */
export function refreshSecondAuthFlag(): boolean {
  secondAuthed = Boolean(getAccessToken());
  emit();
  return secondAuthed;
}

/**
 * 订阅二课是否已有会话
 */
export function useSecondAuth(): { isSecondAuthed: boolean; refresh: () => void } {
  const [isSecondAuthed, setIsSecondAuthed] = useState(secondAuthed);

  useEffect(() => {
    const onChange = () => setIsSecondAuthed(secondAuthed);
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  return {
    isSecondAuthed,
    refresh: () => {
      refreshSecondAuthFlag();
    },
  };
}
