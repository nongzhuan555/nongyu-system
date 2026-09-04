import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
/** 必须用 ESM：`lib/core` CJS 经 Rolldown 后 default 可能仍是 object，触发 React #130 */
import ReactEChartsCore from "echarts-for-react/esm/core";

/** 管理端实际用到的图表类型；禁止 import 全量 echarts */
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
]);

/** 农屿色板图表；随卡片拉伸自动 resize。 */
export function EchartsBlock({ option }: { option: EChartsOption }) {
  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      notMerge
      lazyUpdate
      style={{ height: "100%", width: "100%", minHeight: 160 }}
      opts={{ renderer: "canvas" }}
    />
  );
}
