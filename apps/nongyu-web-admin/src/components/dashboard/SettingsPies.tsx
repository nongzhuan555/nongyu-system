import { useState } from "react";
import type { SettingsDistribution } from "../../types/dashboard";
import { ChartCard } from "./ChartCard";
import { ChartSortToggle } from "./ChartSortToggle";
import type { ChartSortOrder } from "./dashboardCharts";
import { pieOption } from "./dashboardCharts";
import { EchartsBlock } from "./EchartsBlock";

const BLOCKS: { title: string; key: keyof SettingsDistribution }[] = [
  { title: "主题", key: "theme" },
  { title: "首屏课表", key: "homeIsTimetable" },
  { title: "应用内打开网页", key: "openWebInApp" },
  { title: "智慧助手", key: "agentEnabled" },
];

function SettingsPiesBody({
  data,
  sortOrder,
}: {
  data: SettingsDistribution;
  sortOrder: ChartSortOrder;
}) {
  return (
    <div className="grid h-full grid-cols-2 grid-rows-2 gap-1">
      {BLOCKS.map((block) => {
        const option = pieOption(data[block.key], sortOrder);
        return (
          <div key={block.key} className="min-h-0">
            <p className="text-[11px] text-muted">{block.title}</p>
            {option ? (
              <div className="h-[calc(100%-18px)]">
                <EchartsBlock option={option} />
              </div>
            ) : (
              <p className="text-xs text-muted">暂无数据</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** 用户设置分布：卡头带排序，四个小饼共用同一升/降序。 */
export function SortableSettingsCard({
  data,
  loading,
  error,
  layoutEditable = true,
}: {
  data: SettingsDistribution | null;
  loading: boolean;
  error: string | null;
  layoutEditable?: boolean;
}) {
  const [sortOrder, setSortOrder] = useState<ChartSortOrder>("desc");
  return (
    <ChartCard
      title="用户设置分布"
      loading={loading}
      error={error}
      empty={!data}
      layoutEditable={layoutEditable}
      extra={<ChartSortToggle value={sortOrder} onChange={setSortOrder} />}
    >
      {data ? <SettingsPiesBody data={data} sortOrder={sortOrder} /> : null}
    </ChartCard>
  );
}
