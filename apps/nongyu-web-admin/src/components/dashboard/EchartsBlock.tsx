import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";

/** 农屿色板图表；随卡片拉伸自动 resize。 */
export function EchartsBlock({ option }: { option: EChartsOption }) {
  return (
    <ReactECharts
      option={option}
      notMerge
      lazyUpdate
      style={{ height: "100%", width: "100%", minHeight: 160 }}
      opts={{ renderer: "canvas" }}
    />
  );
}
