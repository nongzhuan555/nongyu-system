import type { EChartsOption } from "echarts";
import type { SettingsDistribution } from "../../types/dashboard";
import { pieOption } from "./dashboardCharts";
import { EchartsBlock } from "./EchartsBlock";

const BLOCKS: { title: string; key: keyof SettingsDistribution }[] = [
  { title: "主题", key: "theme" },
  { title: "首屏课表", key: "homeIsTimetable" },
  { title: "应用内打开网页", key: "openWebInApp" },
  { title: "智慧助手", key: "agentEnabled" },
];

export function SettingsPies({ data }: { data: SettingsDistribution }) {
  return (
    <div className="grid h-full grid-cols-2 grid-rows-2 gap-1">
      {BLOCKS.map((block) => {
        const option: EChartsOption | null = pieOption(data[block.key]);
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
