import { ExportOutlined } from "@ant-design/icons";
import { PUSHY_CONSOLE_URL } from "../lib/constants";

/**
 * 版本管理：嵌入 Pushy 官网 / 控制台（iframe）
 * Spec：docs/nongyu-web-admin/specs/版本管理-Pushy嵌入.md
 */
export function VersionsPage() {
  return (
    <div className="flex h-[calc(100vh-7.5rem)] min-h-[28rem] flex-col gap-3 md:h-[calc(100vh-8.5rem)]">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 rounded-3xl bg-white px-4 py-3 shadow-card md:px-5">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-ink">版本管理</h2>
          <p className="mt-1 text-sm text-muted">
            热更新与发版请在下方 Pushy 控制台操作。若页面无法显示，请使用右侧外链。
          </p>
        </div>
        <a
          href={PUSHY_CONSOLE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-emerald-500 px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <ExportOutlined />
          在新窗口打开 Pushy
        </a>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-card">
        <iframe
          title="Pushy 版本管理"
          src={PUSHY_CONSOLE_URL}
          className="h-full w-full border-0"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}
