import { Segmented } from "antd";
import type { ChartSortOrder } from "./dashboardCharts";

/** 大屏分类图：升/降序切换，默认由父组件置为 desc。 */
export function ChartSortToggle({
  value,
  onChange,
}: {
  value: ChartSortOrder;
  onChange: (next: ChartSortOrder) => void;
}) {
  return (
    <Segmented
      size="small"
      value={value}
      options={[
        { label: "降序", value: "desc" },
        { label: "升序", value: "asc" },
      ]}
      onChange={(next) => {
        onChange(next as ChartSortOrder);
      }}
    />
  );
}
