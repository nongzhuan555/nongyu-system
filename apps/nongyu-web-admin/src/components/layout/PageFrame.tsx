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
 * 窄屏：标题与操作纵向堆叠，筛选控件拉满宽，减少横向挤压。
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
    <div className={`mx-auto flex w-full max-w-[1400px] min-w-0 flex-col ${className}`.trim()}>
      <div className="mb-4 flex shrink-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-[20px] font-semibold leading-7 tracking-tight text-ink sm:text-[22px]">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-[13px] leading-5 text-muted">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full min-w-0 shrink-0 flex-col gap-2 lg:w-auto lg:max-w-[min(100%,42rem)] lg:items-end [&_.ant-input]:min-w-0 [&_.ant-input-affix-wrapper]:w-full [&_.ant-select]:w-full [&_button]:w-full lg:[&_.ant-input-affix-wrapper]:w-auto lg:[&_.ant-select]:w-auto lg:[&_button]:w-auto lg:[&_a]:w-auto">
            {actions}
          </div>
        ) : null}
      </div>
      {bare ? (
        <div className="min-h-0 min-w-0 flex-1">{children}</div>
      ) : (
        <div className="min-w-0 overflow-x-auto rounded-2xl border border-line-soft bg-surface p-3 shadow-panel sm:p-4 md:p-5">
          {children}
        </div>
      )}
    </div>
  );
}
