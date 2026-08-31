/** 官网 Core Web Vitals 指标说明（大屏读图用） */
export type WebVitalMeta = {
  key: string;
  label: string;
  meaning: string;
  good: string;
  unit: string;
};

export const WEB_VITAL_METRICS: WebVitalMeta[] = [
  {
    key: "cwv_lcp",
    label: "LCP",
    meaning: "最大内容绘制：主视觉内容出现在屏幕上的时间",
    good: "≤ 2.5 秒",
    unit: "毫秒",
  },
  {
    key: "cwv_inp",
    label: "INP",
    meaning: "交互响应：用户点击/按键到页面有可见反馈的延迟",
    good: "≤ 200 毫秒",
    unit: "毫秒",
  },
  {
    key: "cwv_cls",
    label: "CLS",
    meaning: "布局稳定性：加载过程中页面元素意外抖动的程度",
    good: "≤ 0.1 分（图中 ×1000 即 ≤ 100）",
    unit: "得分×1000",
  },
  {
    key: "cwv_fcp",
    label: "FCP",
    meaning: "首次内容绘制：任意文字/图片首次出现在屏幕上的时间",
    good: "≤ 1.8 秒",
    unit: "毫秒",
  },
  {
    key: "cwv_ttfb",
    label: "TTFB",
    meaning: "首字节时间：浏览器收到服务器第一个响应字节的时间",
    good: "≤ 800 毫秒",
    unit: "毫秒",
  },
];

const META_BY_KEY = new Map(WEB_VITAL_METRICS.map((m) => [m.key, m]));

export function webVitalChartLabel(dimValue: string): string {
  const meta = META_BY_KEY.get(dimValue);
  return meta ? `${meta.label} ${meta.meaning.split("：")[0]}` : dimValue;
}

export function webVitalTooltipLine(
  dimValue: string,
  series: "p50" | "p95",
  value: number,
): string {
  const meta = META_BY_KEY.get(dimValue);
  if (!meta) return `${dimValue} ${series}: ${value}`;
  const unit = meta.key === "cwv_cls" ? "" : " ms";
  const suffix = meta.key === "cwv_cls" ? "（得分×1000）" : unit;
  return `${meta.label} · ${meta.meaning}｜${series.toUpperCase()} ${value}${suffix}`;
}
