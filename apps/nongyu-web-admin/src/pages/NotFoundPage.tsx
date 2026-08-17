import { Link } from "react-router-dom";
import { ROUTES } from "../lib/constants";

export function NotFoundPage() {
  return (
    <div className="rounded-2xl border border-line-soft bg-surface p-6 shadow-panel md:p-8">
      <h1 className="text-[22px] font-semibold tracking-tight text-ink">页面不存在</h1>
      <p className="mt-2 text-sm text-muted">没有找到对应的管理台页面。</p>
      <Link className="mt-6 inline-block text-brand" to={ROUTES.workspace}>
        返回工作台
      </Link>
    </div>
  );
}
