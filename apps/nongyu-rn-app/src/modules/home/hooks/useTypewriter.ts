import { useEffect, useState } from "react";

/**
 * 打字机效果：逐字展示 fullText
 */
export function useTypewriter(fullText: string, intervalMs = 40): string {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    if (!fullText) {
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
  }, [fullText, intervalMs]);

  return displayText;
}
