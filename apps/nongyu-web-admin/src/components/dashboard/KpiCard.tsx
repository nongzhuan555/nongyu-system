import { HolderOutlined } from "@ant-design/icons";

export function KpiCard({
  title,
  value,
  hint,
  loading,
  error,
}: {
  title: string;
  value: number | null;
  hint: string;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-line-soft bg-surface p-3.5 shadow-panel">
      <div
        className="dashboard-drag-handle flex min-h-9 cursor-grab items-center gap-2 rounded-lg px-0.5 active:cursor-grabbing"
        title="按住标题拖动卡片"
      >
        <HolderOutlined className="shrink-0 text-sm text-muted" aria-hidden />
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">{title}</p>
      </div>
      <div className="mt-2 flex flex-1 flex-col justify-center">
        {error ? (
          <p className="text-[13px] text-amber-800">{error}</p>
        ) : loading ? (
          <p className="text-[13px] text-muted">加载中…</p>
        ) : (
          <>
            <p className="text-[28px] font-semibold leading-8 tracking-tight tabular-nums text-ink">
              {value === null ? "—" : value.toLocaleString("zh-CN")}
            </p>
            <p className="mt-1 text-[12px] leading-4 text-muted">{hint}</p>
          </>
        )}
      </div>
    </div>
  );
}
