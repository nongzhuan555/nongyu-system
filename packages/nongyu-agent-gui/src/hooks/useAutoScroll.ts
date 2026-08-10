import { useEffect, useRef, useCallback } from "react";

/**
 * 自动滚动到底部
 *
 * 当 messages 变化时平滑滚动，仅在用户未主动上滑时触发。
 */
export function useAutoScroll(deps: unknown[]): React.RefObject<HTMLDivElement | null> {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isUserScrolledUpRef = useRef(false);
  const prevScrollHeightRef = useRef(0);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "instant",
    });
  }, []);

  // 监听用户手动滚动
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (!el) return;
      const threshold = 80; // 距离底部 80px 内视为"在底部"
      isUserScrolledUpRef.current = el.scrollTop + el.clientHeight < el.scrollHeight - threshold;
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // 内容变化时自动滚动
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // 流式场景：内容增长则滚动
    if (!isUserScrolledUpRef.current) {
      // 使用 requestAnimationFrame 确保 DOM 已更新
      requestAnimationFrame(() => scrollToBottom(false));
    }
    prevScrollHeightRef.current = el.scrollHeight;
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return containerRef;
}
