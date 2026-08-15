import { Link } from "react-router-dom";
import { ROUTES } from "../lib/constants";
import { useAuthStore } from "../stores/authStore";

export function WorkspacePage() {
  const name = useAuthStore((state) => state.user?.name ?? "管理员");

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold text-ink">你好，{name}</h1>
      <p className="mt-2 text-sm text-muted">管理台壳层已就绪，可进入业务模块。</p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link
          to={ROUTES.dashboard}
          className="rounded-3xl bg-white p-6 shadow-card transition-opacity hover:opacity-90"
        >
          <p className="text-lg font-semibold text-ink">数据大屏</p>
          <p className="mt-2 text-sm text-muted">查看运行指标与用户行为</p>
        </Link>
        <Link
          to={ROUTES.users}
          className="rounded-3xl bg-white p-6 shadow-card transition-opacity hover:opacity-90"
        >
          <p className="text-lg font-semibold text-ink">用户管理</p>
          <p className="mt-2 text-sm text-muted">查看与调整用户角色、状态</p>
        </Link>
        <Link
          to={ROUTES.content}
          className="rounded-3xl bg-white p-6 shadow-card transition-opacity hover:opacity-90"
        >
          <p className="text-lg font-semibold text-ink">内容管理</p>
          <p className="mt-2 text-sm text-muted">公告、反馈与建议</p>
        </Link>
      </div>
    </div>
  );
}
