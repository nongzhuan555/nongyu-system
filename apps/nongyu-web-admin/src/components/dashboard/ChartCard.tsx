import { HolderOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";

export function ChartCard({
  title,
  extra,
  loading,
  error,
  empty,
  children,
}: {
  title: string;
  extra?: ReactNode;
  loading: boolean;
  error: string | null;
  empty: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col rounded-3xl bg-white p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div
          className="dashboard-drag-handle flex min-h-11 min-w-0 flex-1 cursor-grab items-center gap-2 rounded-2xl px-1 active:cursor-grabbing"
          title="按住标题拖动卡片"
        >
          <HolderOutlined className="shrink-0 text-base text-muted" aria-hidden />
          <h2 className="truncate text-sm font-semibold text-ink">{title}</h2>
        </div>
        {extra ? <div className="dashboard-no-drag shrink-0">{extra}</div> : null}
      </div>
      <div className="min-h-0 flex-1">
        {error ? (
          <p className="text-sm text-amber-800">{error}</p>
        ) : loading ? (
          <p className="text-sm text-muted">加载中…</p>
        ) : empty ? (
          <p className="text-sm text-muted">暂无数据</p>
        ) : (
          <div className="h-full min-h-[160px]">{children}</div>
        )}
      </div>
    </div>
  );
}
