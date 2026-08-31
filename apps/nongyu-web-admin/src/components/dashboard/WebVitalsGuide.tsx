import { WEB_VITAL_METRICS } from "./webVitalsMeta";

/** 官网 Web Vitals 图表附带的读图说明 */
export function WebVitalsGuide() {
  return (
    <div className="dashboard-no-drag mt-2 space-y-2 border-t border-line-soft pt-2.5 text-[12px] leading-5 text-muted">
      <p className="text-ink">
        <span className="font-semibold text-ink">怎么读这张图</span>
        ：统计今日访问官网的真实用户性能（Google Core Web Vitals）。数据来源与
        App「关键性能」隔离，仅含
        <code className="mx-0.5 rounded bg-elev px-1 py-px font-mono text-[11px]">
          platform=web
        </code>
        上报。
      </p>
      <p>
        每组两根柱：
        <span className="font-medium text-ink"> p50</span> 表示一半用户体验到的水平（典型值）；
        <span className="font-medium text-ink"> p95</span> 表示最差的 5%
        用户（优先优化对象，数值越高越需关注）。 纵轴除 CLS 外均为毫秒；CLS 为稳定性得分 ×1000（例如
        0.08 分显示为 80）。
      </p>
      <div>
        <p className="mb-1 font-medium text-ink">指标含义与参考（Google 建议）</p>
        <ul className="m-0 list-none space-y-1 p-0">
          {WEB_VITAL_METRICS.map((m) => (
            <li key={m.key} className="flex flex-wrap gap-x-1.5">
              <span className="shrink-0 font-semibold tabular-nums text-brand">{m.label}</span>
              <span>{m.meaning}</span>
              <span className="text-[11px] text-muted">· 体验较好：{m.good}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-[11px] text-muted">
        若某指标未出现，表示今日尚无足够采样（例如 INP
        需用户产生点击/按键后才会上报）。刷新大屏可拉取最新聚合。
      </p>
    </div>
  );
}
