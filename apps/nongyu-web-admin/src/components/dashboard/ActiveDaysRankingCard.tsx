import { Select } from "antd";
import { useEffect, useEffectEvent, useState } from "react";
import { AdminApiError, fetchActiveDaysRanking } from "../../lib/adminApi";
import type { ActiveDaysRankingItem, ActiveDaysRankingLimit } from "../../types/dashboard";
import { ChartCard } from "./ChartCard";
import { ChartSortToggle } from "./ChartSortToggle";
import { activeDaysRankingOption, type ChartSortOrder } from "./dashboardCharts";
import { EchartsBlock } from "./EchartsBlock";

const LIMIT_OPTIONS: { value: ActiveDaysRankingLimit; label: string }[] = [
  { value: 50, label: "Top 50" },
  { value: 100, label: "Top 100" },
  { value: 200, label: "Top 200" },
];

/**
 * 用户累计活跃天数排行：自拉取接口，失败与其它大屏卡隔离。
 */
export function ActiveDaysRankingCard({ layoutEditable = true }: { layoutEditable?: boolean }) {
  const [limit, setLimit] = useState<ActiveDaysRankingLimit>(50);
  const [sortOrder, setSortOrder] = useState<ChartSortOrder>("desc");
  const [list, setList] = useState<ActiveDaysRankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useEffectEvent(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchActiveDaysRanking({ limit, order: sortOrder });
      setList(data.list);
    } catch (err) {
      setList([]);
      setError(err instanceof AdminApiError ? err.serverMessage : "网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    void load();
  }, [limit, sortOrder]);

  const option = activeDaysRankingOption(list);

  return (
    <ChartCard
      title="用户活跃排行"
      loading={loading}
      error={error}
      empty={!option}
      emptyText="暂无累计活跃数据"
      layoutEditable={layoutEditable}
      extra={
        <div className="flex items-center gap-2">
          <Select<ActiveDaysRankingLimit>
            size="small"
            className="w-[96px]"
            value={limit}
            options={LIMIT_OPTIONS}
            onChange={setLimit}
          />
          <ChartSortToggle value={sortOrder} onChange={setSortOrder} />
        </div>
      }
    >
      {option ? <EchartsBlock option={option} /> : null}
    </ChartCard>
  );
}
