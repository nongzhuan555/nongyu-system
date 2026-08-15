import { useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 300;
const FAKE_DELAY_MS = 400;

export type DeferredLocalSearch = {
  /** 输入框草稿 */
  draft: string;
  setDraft: (text: string) => void;
  /** 防抖+假延时后生效的关键词，用于 filter */
  query: string;
  /** 假延时期间为 true */
  searching: boolean;
};

/**
 * 教务本地搜索：防抖 300ms + 假延时 400ms 模拟联网；清空立即生效
 */
export function useDeferredLocalSearch(): DeferredLocalSearch {
  const [draft, setDraftState] = useState("");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (delayRef.current) {
      clearTimeout(delayRef.current);
      delayRef.current = null;
    }
  };

  useEffect(() => () => clearTimers(), []);

  const setDraft = (text: string) => {
    setDraftState(text);
    clearTimers();

    // 清空：立即恢复，不走延时
    if (!text.trim()) {
      setQuery("");
      setSearching(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      setSearching(true);
      delayRef.current = setTimeout(() => {
        setQuery(text);
        setSearching(false);
        delayRef.current = null;
      }, FAKE_DELAY_MS);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
  };

  return { draft, setDraft, query, searching };
}
