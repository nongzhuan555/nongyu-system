import { useEffect, useState } from "react";

export type TypewriterResult = {
  displayText: string;
  /** 已展示完全文 */
  done: boolean;
};

type UseTypewriterOptions = {
  intervalMs?: number;
  /** false 时清空并暂停（如气泡隐藏） */
  active?: boolean;
};

/**
 * 打字机：逐字展示 fullText
 */
export function useTypewriter(
  fullText: string,
  options: UseTypewriterOptions = {},
): TypewriterResult {
  const { intervalMs = 40, active = true } = options;
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    if (!active || !fullText) {
      setDisplayText("");
      return;
    }
    setDisplayText("");
    let index = 0;
    const timer = setInterval(() => {
      index += 1;
      setDisplayText(fullText.slice(0, index));
      if (index >= fullText.length) {
        clearInterval(timer);
      }
    }, intervalMs);
    return () => clearInterval(timer);
  }, [fullText, intervalMs, active]);

  const done = active && fullText.length > 0 && displayText.length >= fullText.length;

  return { displayText, done };
}
