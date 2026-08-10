interface EmptyStateProps {
  welcomeMessage?: string;
  suggestedQuestions?: string[];
  onQuestionClick: (question: string) => void;
}

/**
 * 空状态 — 欢迎页 + 建议问题
 */
export function EmptyState({
  welcomeMessage = "有什么想问农小屿的吗?",
  suggestedQuestions,
  onQuestionClick,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-12">
      {/* Logo / Icon */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-6 shadow-lg shadow-emerald-200/50">
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>

      {/* 欢迎语 */}
      <h2 className="text-xl font-semibold text-slate-800 mb-2">农小屿</h2>
      <p className="text-slate-500 text-sm mb-8">{welcomeMessage}</p>

      {/* 建议问题 */}
      {suggestedQuestions && suggestedQuestions.length > 0 && (
        <div className="grid gap-2 w-full max-w-md">
          {suggestedQuestions.map((question, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onQuestionClick(question)}
              className="text-left px-4 py-3 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-700 transition-all shadow-sm"
            >
              {question}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
