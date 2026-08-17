import { useEffect, useRef, type KeyboardEvent } from "react";

type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isLoading: boolean;
};

/**
 * 对齐 RN AiChatPanel composer：圆角输入条 + 圆形发送/停止
 */
export function ChatComposer({ value, onChange, onSend, onStop, isLoading }: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const trimmed = value.trim();
  const sendEnabled = !isLoading && Boolean(trimmed);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (isLoading) return;
      if (trimmed) onSend();
    }
  }

  return (
    <div className="shrink-0 border-t border-line-soft bg-canvas px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
      <div
        className={`flex min-h-12 items-end rounded-3xl border border-line-soft bg-surface py-1.5 pl-4 pr-1.5 shadow-sm transition-opacity ${
          isLoading ? "opacity-75" : ""
        }`}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          disabled={isLoading}
          placeholder={isLoading ? "生成中，请稍候…" : "有什么想对农小屿说的吗？"}
          className="max-h-[120px] min-h-[34px] flex-1 resize-none bg-transparent py-2 pr-2 text-[15px] leading-[22px] text-ink outline-none placeholder:text-muted disabled:cursor-not-allowed"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {isLoading ? (
          <button
            type="button"
            aria-label="停止生成"
            className="mb-0.5 inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-ink text-white transition-colors hover:bg-ink/90"
            onClick={onStop}
          >
            <span className="block h-2.5 w-2.5 rounded-[2px] bg-white" />
          </button>
        ) : (
          <button
            type="button"
            aria-label="发送"
            disabled={!sendEnabled}
            className={`mb-0.5 inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full transition-colors ${
              sendEnabled ? "bg-brand text-white hover:bg-brand/90" : "bg-elev text-muted"
            }`}
            onClick={onSend}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 19V5M12 5l-6 6M12 5l6 6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
      <p className="mt-1.5 px-1 text-[11px] text-muted">
        {isLoading ? "农小屿码字中…" : "Enter 发送 · Shift+Enter 换行"}
      </p>
    </div>
  );
}
