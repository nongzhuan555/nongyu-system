type ChatEmptyStateProps = {
  adminName: string;
  suggestions: string[];
  onSuggestion: (text: string) => void;
};

/**
 * 对齐 RN ChatEmptyState：居中品牌问候 + 全宽建议条
 */
export function ChatEmptyState({ adminName, suggestions, onSuggestion }: ChatEmptyStateProps) {
  const greetName = adminName.trim() || "管理员";

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5 pb-8">
      <div className="mb-4 h-[72px] w-[72px] overflow-hidden rounded-full border border-line-soft bg-brand-muted shadow-sm">
        <div className="flex h-full w-full items-center justify-center text-[28px] font-semibold tracking-tight text-brand">
          屿
        </div>
      </div>
      <h2 className="mb-1 text-center text-xl font-semibold tracking-wide text-ink">
        {greetName}你好！我是农小屿~
      </h2>
      <p className="mb-8 text-center text-[15px] text-muted">管理台只读问数助手</p>

      <div className="flex w-full max-w-[360px] flex-col gap-2">
        {suggestions.map((text) => (
          <button
            key={text}
            type="button"
            className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-line-soft bg-surface px-4 py-3.5 text-left transition-colors hover:bg-elev active:bg-elev"
            onClick={() => onSuggestion(text)}
          >
            <span className="flex-1 text-sm leading-5 text-ink">{text}</span>
            <span className="shrink-0 text-muted" aria-hidden>
              ↑
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
