import { useRef, useEffect, useCallback, type KeyboardEvent } from "react";

interface ChatInputProps {
  value: string;
  onChange: (e: { target: { value: string } } | string) => void;
  onSubmit: () => void;
  /** 是否正在生成回复（此时按钮变为停止） */
  isLoading: boolean;
  placeholder?: string;
}

/**
 * 聊天输入区域
 *
 * - 自动 resize textarea
 * - Enter 发送，Shift+Enter 换行(对齐市面上其他聊天软件的输入行为)
 * - 毛玻璃效果
 * - 加载中显示停止按钮
 */
export function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  placeholder = "有什么想问农小屿的吗?",
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动调整输入框高度
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // 单独按下Enter则发送消息
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!isLoading && value.trim()) {
          onSubmit();
        }
      }
    },
    [isLoading, value, onSubmit],
  );

  return (
    <div className="flex-shrink-0 border-t border-slate-200/60 px-4 py-3">
      <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-2xl shadow-sm focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20 transition-all">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e)}
          onKeyDown={handleKeyDown}
          placeholder={isLoading ? "农小屿正在马不停蹄地回复你哟..." : placeholder}
          rows={1}
          className="w-full resize-none bg-transparent px-4 py-3 text-[15px] text-slate-800 placeholder:text-slate-400 outline-none leading-relaxed"
        />
        <div className="flex items-center justify-between px-3 pb-3">
          <span className="text-xs text-slate-400 ml-1">
            {isLoading ? "农小屿码字中..." : "Shift + Enter 换行"}
          </span>

          {isLoading ? (
            /* 停止按钮 */
            <button
              type="button"
              onClick={onSubmit}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
              title="Stop!"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            /* 发送按钮 */
            <button
              type="button"
              onClick={onSubmit}
              disabled={!value.trim()}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
