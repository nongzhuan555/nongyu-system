import type { EChartsOption } from "echarts";
import { useState, type ReactNode } from "react";
import { ChartCard } from "./ChartCard";
import { ChartSortToggle } from "./ChartSortToggle";
import type { ChartSortOrder } from "./dashboardCharts";
import { EchartsBlock } from "./EchartsBlock";

type SortableChartCardProps = {
  title: string;
  loading: boolean;
  error: string | null;
  layoutEditable?: boolean;
  /** 按当前排序生成 ECharts option；无数据返回 null */
  buildOption: (sortOrder: ChartSortOrder) => EChartsOption | null;
  /** 图表下方附加内容（如 Web Vitals 说明） */
  footer?: ReactNode;
  /** 与排序控件并排的额外操作 */
  extraBeforeSort?: ReactNode;
};

/** 带默认降序切换的图表卡。 */
export function SortableChartCard({
  title,
  loading,
  error,
  layoutEditable = true,
  buildOption,
  footer,
  extraBeforeSort,
}: SortableChartCardProps) {
  const [sortOrder, setSortOrder] = useState<ChartSortOrder>("desc");
  const option = buildOption(sortOrder);
  return (
    <ChartCard
      title={title}
      loading={loading}
      error={error}
      empty={!option}
      layoutEditable={layoutEditable}
      extra={
        <div className="flex items-center gap-2">
          {extraBeforeSort}
          <ChartSortToggle value={sortOrder} onChange={setSortOrder} />
        </div>
      }
    >
      {option ? (
        footer ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-[140px] flex-1">
              <EchartsBlock option={option} />
            </div>
            {footer}
          </div>
        ) : (
          <EchartsBlock option={option} />
        )
      ) : null}
    </ChartCard>
  );
}
