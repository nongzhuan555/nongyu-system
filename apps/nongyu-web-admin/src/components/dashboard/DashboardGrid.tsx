import { useEffect, useRef } from "react";
import { Grid, Select } from "antd";
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
import {
  barOption,
  buttonClicksBarOption,
  dimBarOption,
  dwellBarOption,
  growthOption,
  perfOption,
  pieOption,
  webVitalsOption,
} from "./dashboardCharts";
import { EchartsBlock } from "./EchartsBlock";
import { KpiCard } from "./KpiCard";
import { SettingsPies } from "./SettingsPies";
import { WebVitalsGuide } from "./WebVitalsGuide";

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
  screenDwell: TrackDimItem[];
  buttonClicks: TrackDimItem[];
  perfP50: TrackDimItem[];
  perfP95: TrackDimItem[];
  webVitalP50: TrackDimItem[];
  webVitalP95: TrackDimItem[];
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
  const screens = Grid.useBreakpoint();
  /** ≥ lg(992) 才允许拖拽/缩放；窄屏仅浏览 */
  const canEditLayout = screens.lg ?? false;
  /** 忽略挂载/断点切换时 RGL 自动 compact 触发的 onLayoutChange，避免覆盖 localStorage 布局 */
  const layoutTouchedRef = useRef(false);
  /** RGL 先 onDragStop/onResizeStop 再 onLayoutChange；持久化必须等 layout 变更后再写 */
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, []);

  function scheduleLayoutPersist() {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      onLayoutPersist();
    }, 80);
  }

  return (
    <ResponsiveGridLayout
      className="dashboard-grid"
      layouts={prefs.layouts as Layouts}
      breakpoints={GRID_BREAKPOINTS}
      cols={GRID_COLS}
      rowHeight={GRID_ROW_HEIGHT}
      margin={canEditLayout ? [16, 16] : [10, 10]}
      compactType="vertical"
      isDraggable={canEditLayout}
      isResizable={canEditLayout}
      draggableHandle=".dashboard-drag-handle"
      draggableCancel=".dashboard-no-drag,input,button,textarea,.ant-select,.ant-pagination"
      onLayoutChange={(_current: Layout[], all: Layouts) => {
        if (!layoutTouchedRef.current) return;
        onLayoutsChange(all);
        scheduleLayoutPersist();
      }}
      onDragStart={() => {
        layoutTouchedRef.current = true;
      }}
      onResizeStart={() => {
        layoutTouchedRef.current = true;
      }}
    >
      {renderWidgets({
        data,
        coreLoading,
        trackLoading,
        crashLoading,
        coreError,
        trackError,
        growthRange: prefs.growthRange,
        layoutEditable: canEditLayout,
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
  layoutEditable: boolean;
  onGrowthRangeChange: (range: GrowthRange) => void;
  onCrashPageChange: (page: number) => void;
}) {
  const ids: WidgetId[] = [
    "kpi-total-users",
    "kpi-dau",
    "kpi-online",
    "kpi-today-new",
    "kpi-web-pv",
    "chart-user-growth",
    "chart-gender",
    "chart-college",
    "chart-grade",
    "chart-device",
    "chart-screen-views",
    "chart-screen-dwell",
    "chart-button-clicks",
    "chart-settings",
    "chart-perf",
    "chart-web-vitals",
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
    layoutEditable: boolean;
    onGrowthRangeChange: (range: GrowthRange) => void;
    onCrashPageChange: (page: number) => void;
  },
) {
  const { data, layoutEditable } = args;
  if (id === "kpi-total-users") {
    return (
      <KpiCard
        title="总用户数"
        value={data.overview?.totalUsers ?? null}
        hint={data.overview ? `其中管理员 ${data.overview.totalAdmins}` : "含管理员子集"}
        loading={args.coreLoading}
        error={args.coreError}
        layoutEditable={layoutEditable}
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
        layoutEditable={layoutEditable}
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
        layoutEditable={layoutEditable}
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
        layoutEditable={layoutEditable}
      />
    );
  }
  if (id === "kpi-web-pv") {
    return (
      <KpiCard
        title="今日官网访问"
        value={data.trackOverview?.webScreenViewCount ?? null}
        hint="每次打开/刷新官网计 1 次（PV），不含 App 页面浏览"
        loading={args.trackLoading}
        error={args.trackError}
        layoutEditable={layoutEditable}
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
        layoutEditable={layoutEditable}
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
      <ChartCard
        title="性别分布"
        loading={args.coreLoading}
        error={args.coreError}
        empty={!option}
        layoutEditable={layoutEditable}
      >
        {option ? <EchartsBlock option={option} /> : null}
      </ChartCard>
    );
  }
  if (id === "chart-college") {
    const option = data.distribution ? barOption(data.distribution.college, true) : null;
    return (
      <ChartCard
        title="学院分布"
        loading={args.coreLoading}
        error={args.coreError}
        empty={!option}
        layoutEditable={layoutEditable}
      >
        {option ? <EchartsBlock option={option} /> : null}
      </ChartCard>
    );
  }
  if (id === "chart-grade") {
    const option = data.distribution ? barOption(data.distribution.grade) : null;
    return (
      <ChartCard
        title="年级分布"
        loading={args.coreLoading}
        error={args.coreError}
        empty={!option}
        layoutEditable={layoutEditable}
      >
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
        layoutEditable={layoutEditable}
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
        layoutEditable={layoutEditable}
      >
        {option ? <EchartsBlock option={option} /> : null}
      </ChartCard>
    );
  }
  if (id === "chart-screen-dwell") {
    const option = dwellBarOption(data.screenDwell);
    return (
      <ChartCard
        title="页均停留时长"
        loading={args.trackLoading}
        error={args.trackError}
        empty={!option}
        layoutEditable={layoutEditable}
      >
        {option ? <EchartsBlock option={option} /> : null}
      </ChartCard>
    );
  }
  if (id === "chart-button-clicks") {
    const option = buttonClicksBarOption(data.buttonClicks);
    return (
      <ChartCard
        title="按钮点击分布"
        loading={args.trackLoading}
        error={args.trackError}
        empty={!option}
        layoutEditable={layoutEditable}
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
        layoutEditable={layoutEditable}
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
        layoutEditable={layoutEditable}
      >
        {option ? <EchartsBlock option={option} /> : null}
      </ChartCard>
    );
  }
  if (id === "chart-web-vitals") {
    const option = webVitalsOption(data.webVitalP50, data.webVitalP95);
    return (
      <ChartCard
        title="官网 Web Vitals"
        loading={args.trackLoading}
        error={args.trackError}
        empty={!option}
        layoutEditable={layoutEditable}
      >
        {option ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-[140px] flex-1">
              <EchartsBlock option={option} />
            </div>
            <WebVitalsGuide />
          </div>
        ) : null}
      </ChartCard>
    );
  }
  return (
    <ChartCard
      title="错误捕获"
      loading={args.crashLoading && !data.crashes}
      error={args.trackError}
      empty={false}
      layoutEditable={layoutEditable}
    >
      <CrashesTable
        data={data.crashes}
        loading={args.crashLoading}
        onPageChange={args.onCrashPageChange}
      />
    </ChartCard>
  );
}
