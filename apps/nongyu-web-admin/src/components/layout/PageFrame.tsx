import type { ReactNode } from "react";

type PageFrameProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** 去掉默认外层白底（如内嵌 iframe、大屏） */
  bare?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * 管理端统一页框：标题层级 + 可选操作 + 内容区，校正相对尺度与密度。
 */
export function PageFrame({
  title,
  description,
  actions,
  bare = false,
  children,
  className = "",
}: PageFrameProps) {
  return (
    <div className={`mx-auto flex w-full max-w-[1400px] flex-col ${className}`.trim()}>
      <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[20px] font-semibold leading-7 tracking-tight text-ink sm:text-[22px]">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-[13px] leading-5 text-muted">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end [&_.ant-input]:min-w-0 [&_.ant-input-affix-wrapper]:w-full [&_.ant-input-affix-wrapper]:sm:w-auto [&_.ant-select]:w-full [&_.ant-select]:sm:w-auto [&_button]:w-full [&_button]:sm:w-auto [&_a]:w-full [&_a]:sm:w-auto">
            {actions}
          </div>
        ) : null}
      </div>
      {bare ? (
        <div className="min-h-0 flex-1">{children}</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line-soft bg-surface p-3 shadow-panel sm:p-4 md:p-5">
          {children}
        </div>
      )}
    </div>
  );
}
