import { Select } from "antd";
import { Responsive, WidthProvider, type Layout, type Layouts } from "react-grid-layout";
import type {
  DashboardOverview,
  DashboardPrefsV1,
  GrowthRange,
  SettingsDistribution,
  TrackCrashPage,
  TrackDimItem,
  TrackOverview,
  UserDistribution,
  UserGrowth,
} from "../../types/dashboard";
import {
  GRID_BREAKPOINTS,
  GRID_COLS,
  GRID_ROW_HEIGHT,
  type WidgetId,
} from "../../lib/dashboardLayout";
import { ChartCard } from "./ChartCard";
import { CrashesTable } from "./CrashesTable";
import { barOption, dimBarOption, growthOption, perfOption, pieOption } from "./dashboardCharts";
import { EchartsBlock } from "./EchartsBlock";
import { KpiCard } from "./KpiCard";
import { SettingsPies } from "./SettingsPies";

const ResponsiveGridLayout = WidthProvider(Responsive);

const RANGE_OPTIONS = [
  { value: "7d", label: "近 7 天" },
  { value: "30d", label: "近 30 天" },
  { value: "90d", label: "近 90 天" },
  { value: "180d", label: "近半年" },
  { value: "365d", label: "近一年" },
];

export type DashboardGridData = {
  overview: DashboardOverview | null;
  growth: UserGrowth | null;
  distribution: UserDistribution | null;
  settings: SettingsDistribution | null;
  trackOverview: TrackOverview | null;
  screenViews: TrackDimItem[];
  perfP50: TrackDimItem[];
  perfP95: TrackDimItem[];
  crashes: TrackCrashPage | null;
};

export function DashboardGrid({
  prefs,
  data,
  coreLoading,
  trackLoading,
  crashLoading,
  coreError,
  trackError,
  onLayoutsChange,
  onLayoutPersist,
  onGrowthRangeChange,
  onCrashPageChange,
}: {
  prefs: DashboardPrefsV1;
  data: DashboardGridData;
  coreLoading: boolean;
  trackLoading: boolean;
  crashLoading: boolean;
  coreError: string | null;
  trackError: string | null;
  onLayoutsChange: (layouts: Layouts) => void;
  onLayoutPersist: () => void;
  onGrowthRangeChange: (range: GrowthRange) => void;
  onCrashPageChange: (page: number) => void;
}) {
  return (
    <ResponsiveGridLayout
      className="dashboard-grid"
      layouts={prefs.layouts as Layouts}
      breakpoints={GRID_BREAKPOINTS}
      cols={GRID_COLS}
      rowHeight={GRID_ROW_HEIGHT}
      margin={[16, 16]}
      compactType="vertical"
      isDraggable
      isResizable
      draggableHandle=".dashboard-drag-handle"
      draggableCancel=".dashboard-no-drag,input,button,textarea,.ant-select,.ant-pagination"
      onLayoutChange={(_current: Layout[], all: Layouts) => onLayoutsChange(all)}
      onDragStop={onLayoutPersist}
      onResizeStop={onLayoutPersist}
    >
      {renderWidgets({
        data,
        coreLoading,
        trackLoading,
        crashLoading,
        coreError,
        trackError,
        growthRange: prefs.growthRange,
        onGrowthRangeChange,
        onCrashPageChange,
      })}
    </ResponsiveGridLayout>
  );
}

function renderWidgets(args: {
  data: DashboardGridData;
  coreLoading: boolean;
  trackLoading: boolean;
  crashLoading: boolean;
  coreError: string | null;
  trackError: string | null;
  growthRange: GrowthRange;
  onGrowthRangeChange: (range: GrowthRange) => void;
  onCrashPageChange: (page: number) => void;
}) {
  const ids: WidgetId[] = [
    "kpi-total-users",
    "kpi-dau",
    "kpi-online",
    "kpi-today-new",
    "chart-user-growth",
    "chart-gender",
    "chart-campus",
    "chart-college",
    "chart-grade",
    "chart-device",
    "chart-screen-views",
    "chart-settings",
    "chart-perf",
    "table-crashes",
  ];
  return ids.map((id) => <div key={id}>{widgetBody(id, args)}</div>);
}

function widgetBody(
  id: WidgetId,
  args: {
    data: DashboardGridData;
    coreLoading: boolean;
    trackLoading: boolean;
    crashLoading: boolean;
    coreError: string | null;
    trackError: string | null;
    growthRange: GrowthRange;
    onGrowthRangeChange: (range: GrowthRange) => void;
    onCrashPageChange: (page: number) => void;
  },
) {
  const { data } = args;
  if (id === "kpi-total-users") {
    return (
      <KpiCard
        title="总用户数"
        value={data.overview?.totalUsers ?? null}
        hint={data.overview ? `其中管理员 ${data.overview.totalAdmins}` : "含管理员子集"}
        loading={args.coreLoading}
        error={args.coreError}
      />
    );
  }
  if (id === "kpi-dau") {
    return (
      <KpiCard
        title="今日日活"
        value={data.trackOverview?.dau ?? null}
        hint="当日至少一次打开 App"
        loading={args.trackLoading}
        error={args.trackError}
      />
    );
  }
  if (id === "kpi-online") {
    return (
      <KpiCard
        title="当前在线"
        value={data.overview?.onlineUsers ?? null}
        hint="近 10 分钟有心跳"
        loading={args.coreLoading}
        error={args.coreError}
      />
    );
  }
  if (id === "kpi-today-new") {
    return (
      <KpiCard
        title="今日新增"
        value={data.overview?.todayNewUsers ?? null}
        hint="今日完成注册的用户"
        loading={args.coreLoading}
        error={args.coreError}
      />
    );
  }
  if (id === "chart-user-growth") {
    const option = data.growth ? growthOption(data.growth) : null;
    return (
      <ChartCard
        title="用户增长趋势"
        loading={args.coreLoading}
        error={args.coreError}
        empty={!option}
        extra={
          <Select
            size="small"
            value={args.growthRange}
            options={RANGE_OPTIONS}
            onChange={(value) => args.onGrowthRangeChange(value as GrowthRange)}
            className="min-w-28"
          />
        }
      >
        {option ? <EchartsBlock option={option} /> : null}
      </ChartCard>
    );
  }
  if (id === "chart-gender") {
    const option = data.distribution ? pieOption(data.distribution.gender) : null;
    return (
      <ChartCard title="性别分布" loading={args.coreLoading} error={args.coreError} empty={!option}>
        {option ? <EchartsBlock option={option} /> : null}
      </ChartCard>
    );
  }
  if (id === "chart-campus") {
    const option = data.distribution ? pieOption(data.distribution.campus) : null;
    return (
      <ChartCard title="校区分布" loading={args.coreLoading} error={args.coreError} empty={!option}>
        {option ? <EchartsBlock option={option} /> : null}
      </ChartCard>
    );
  }
  if (id === "chart-college") {
    const option = data.distribution ? barOption(data.distribution.college, true) : null;
    return (
      <ChartCard title="学院分布" loading={args.coreLoading} error={args.coreError} empty={!option}>
        {option ? <EchartsBlock option={option} /> : null}
      </ChartCard>
    );
  }
  if (id === "chart-grade") {
    const option = data.distribution ? barOption(data.distribution.grade) : null;
    return (
      <ChartCard title="年级分布" loading={args.coreLoading} error={args.coreError} empty={!option}>
        {option ? <EchartsBlock option={option} /> : null}
      </ChartCard>
    );
  }
  if (id === "chart-device") {
    const option = data.distribution ? pieOption(data.distribution.deviceBrand) : null;
    return (
      <ChartCard
        title="设备品牌分布"
        loading={args.coreLoading}
        error={args.coreError}
        empty={!option}
      >
        {option ? <EchartsBlock option={option} /> : null}
      </ChartCard>
    );
  }
  if (id === "chart-screen-views") {
    const option = dimBarOption(data.screenViews);
    return (
      <ChartCard
        title="页面使用次数"
        loading={args.trackLoading}
        error={args.trackError}
        empty={!option}
      >
        {option ? <EchartsBlock option={option} /> : null}
      </ChartCard>
    );
  }
  if (id === "chart-settings") {
    const empty = !data.settings;
    return (
      <ChartCard
        title="用户设置分布"
        loading={args.coreLoading}
        error={args.coreError}
        empty={empty}
      >
        {data.settings ? <SettingsPies data={data.settings} /> : null}
      </ChartCard>
    );
  }
  if (id === "chart-perf") {
    const option = perfOption(data.perfP50, data.perfP95);
    return (
      <ChartCard
        title="关键性能"
        loading={args.trackLoading}
        error={args.trackError}
        empty={!option}
      >
        {option ? <EchartsBlock option={option} /> : null}
      </ChartCard>
    );
  }
  return (
    <ChartCard
      title="错误捕获"
      loading={args.crashLoading && !data.crashes}
      error={args.trackError}
      empty={false}
    >
      <CrashesTable
        data={data.crashes}
        loading={args.crashLoading}
        onPageChange={args.onCrashPageChange}
      />
    </ChartCard>
  );
}
