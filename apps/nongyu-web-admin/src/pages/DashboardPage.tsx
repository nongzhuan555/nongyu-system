import { Button } from "antd";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { Layouts } from "react-grid-layout";
import { DashboardGrid, type DashboardGridData } from "../components/dashboard/DashboardGrid";
import {
  AdminApiError,
  fetchDashboardOverview,
  fetchSettingsDistribution,
  fetchTrackCrashes,
  fetchTrackDims,
  fetchTrackOverview,
  fetchUserDistribution,
  fetchUserGrowth,
} from "../lib/adminApi";
import { AUTH_ERROR_CODES } from "../lib/constants";
import {
  clearDashboardPrefs,
  defaultDashboardPrefs,
  readDashboardPrefs,
  writeDashboardPrefs,
} from "../lib/dashboardPrefs";
import type { DashboardPrefsV1, GrowthRange } from "../types/dashboard";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const EMPTY_DATA: DashboardGridData = {
  overview: null,
  growth: null,
  distribution: null,
  settings: null,
  trackOverview: null,
  screenViews: [],
  perfP50: [],
  perfP95: [],
  crashes: null,
};

function messageFromError(err: unknown, track: boolean): string {
  if (err instanceof AdminApiError) {
    if (err.code === AUTH_ERROR_CODES.ADMIN_REQUIRED) {
      return "当前会话无权查看大屏，请先在农屿 App 使用该学号登录完成建档。";
    }
    if (
      track &&
      (err.code === AUTH_ERROR_CODES.TRACK_UNAVAILABLE ||
        err.code === AUTH_ERROR_CODES.TRACK_BAD_GATEWAY)
    ) {
      return "埋点指标暂不可用";
    }
    return err.serverMessage;
  }
  return "网络异常，请稍后重试";
}

export function DashboardPage() {
  const [prefs, setPrefs] = useState<DashboardPrefsV1>(() => readDashboardPrefs());
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const [data, setData] = useState<DashboardGridData>(EMPTY_DATA);
  const [coreLoading, setCoreLoading] = useState(true);
  const [trackLoading, setTrackLoading] = useState(true);
  const [crashLoading, setCrashLoading] = useState(false);
  const [coreError, setCoreError] = useState<string | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [crashPage, setCrashPage] = useState(1);

  const loadCore = useEffectEvent(async (range: GrowthRange) => {
    setCoreLoading(true);
    setCoreError(null);
    try {
      const [overview, growth, distribution, settings] = await Promise.all([
        fetchDashboardOverview(),
        fetchUserGrowth(range),
        fetchUserDistribution(),
        fetchSettingsDistribution(),
      ]);
      setData((prev) => ({ ...prev, overview, growth, distribution, settings }));
    } catch (err) {
      setCoreError(messageFromError(err, false));
    } finally {
      setCoreLoading(false);
    }
  });

  const loadTrack = useEffectEvent(async (page: number) => {
    setTrackLoading(true);
    setTrackError(null);
    try {
      const [trackOverview, screens, p50, p95, crashes] = await Promise.all([
        fetchTrackOverview(),
        fetchTrackDims("screen_views"),
        fetchTrackDims("perf_p50"),
        fetchTrackDims("perf_p95"),
        fetchTrackCrashes(page, 10),
      ]);
      setData((prev) => ({
        ...prev,
        trackOverview,
        screenViews: screens.items,
        perfP50: p50.items,
        perfP95: p95.items,
        crashes,
      }));
    } catch (err) {
      setTrackError(messageFromError(err, true));
    } finally {
      setTrackLoading(false);
    }
  });

  useEffect(() => {
    void loadCore(prefs.growthRange);
    void loadTrack(crashPage);
  }, []);

  function persistPrefs(next: DashboardPrefsV1) {
    setPrefs(next);
    writeDashboardPrefs(next);
  }

  function handleLayoutsChange(layouts: Layouts) {
    setPrefs((prev) => ({ ...prev, layouts }));
  }

  function handleLayoutPersist() {
    writeDashboardPrefs(prefsRef.current);
  }

  async function handleGrowthRangeChange(range: GrowthRange) {
    persistPrefs({ ...prefsRef.current, growthRange: range });
    try {
      const growth = await fetchUserGrowth(range);
      setData((prev) => ({ ...prev, growth }));
    } catch (err) {
      setCoreError(messageFromError(err, false));
    }
  }

  async function handleCrashPageChange(page: number) {
    setCrashPage(page);
    setCrashLoading(true);
    try {
      const crashes = await fetchTrackCrashes(page, 10);
      setData((prev) => ({ ...prev, crashes }));
    } catch {
      // 翻页失败保留已有列表，避免把其它埋点卡片打成错误
    } finally {
      setCrashLoading(false);
    }
  }

  function handleResetLayout() {
    clearDashboardPrefs();
    const next = defaultDashboardPrefs();
    persistPrefs(next);
    void loadCore("7d");
  }

  function handleRefresh() {
    void loadCore(prefsRef.current.growthRange);
    void loadTrack(crashPage);
  }

  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            查看系统运行状态与用户行为。按住卡片标题左侧 ∷
            拖动可换位，右下角可缩放；图表区域本身不拖动以免抢 tooltip。
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="min-h-11" onClick={handleRefresh}>
            刷新
          </Button>
          <Button className="min-h-11" onClick={handleResetLayout}>
            恢复默认布局
          </Button>
        </div>
      </div>
      <DashboardGrid
        prefs={prefs}
        data={data}
        coreLoading={coreLoading}
        trackLoading={trackLoading}
        crashLoading={crashLoading}
        coreError={coreError}
        trackError={trackError}
        onLayoutsChange={handleLayoutsChange}
        onLayoutPersist={handleLayoutPersist}
        onGrowthRangeChange={(range) => {
          void handleGrowthRangeChange(range);
        }}
        onCrashPageChange={(page) => {
          void handleCrashPageChange(page);
        }}
      />
    </div>
  );
}
