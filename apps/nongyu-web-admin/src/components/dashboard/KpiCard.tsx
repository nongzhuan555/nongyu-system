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
    <div className="flex h-full min-h-0 flex-col rounded-3xl bg-white p-4 shadow-card">
      <div
        className="dashboard-drag-handle flex min-h-11 cursor-grab items-center gap-2 rounded-2xl px-1 active:cursor-grabbing"
        title="按住标题拖动卡片"
      >
        <HolderOutlined className="shrink-0 text-base text-muted" aria-hidden />
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{title}</p>
      </div>
      <div className="mt-3 flex flex-1 flex-col justify-center">
        {error ? (
          <p className="text-sm text-amber-800">{error}</p>
        ) : loading ? (
          <p className="text-sm text-muted">加载中…</p>
        ) : (
          <>
            <p className="text-3xl font-semibold tabular-nums text-ink">
              {value === null ? "—" : value.toLocaleString("zh-CN")}
            </p>
            <p className="mt-1 text-xs text-muted">{hint}</p>
          </>
        )}
      </div>
    </div>
  );
}
