import { Button } from "antd";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { Layouts } from "react-grid-layout";
import { DashboardGrid, type DashboardGridData } from "../components/dashboard/DashboardGrid";
import { TrackSampleRateBar } from "../components/dashboard/TrackSampleRateBar";
import { PageFrame } from "../components/layout/PageFrame";
import { useForegroundRefresh } from "../hooks/useForegroundRefresh";
import {
  AdminApiError,
  fetchDashboardOverview,
  fetchTrackCrashes,
  fetchTrackDims,
  fetchTrackOverview,
  fetchUserDistribution,
  fetchUserGrowth,
} from "../lib/adminApi";
import { AUTH_ERROR_CODES, FOREGROUND_REFRESH_INTERVAL_MS } from "../lib/constants";
import { useAuthStore } from "../stores/authStore";
import {
  clearDashboardPrefs,
  defaultDashboardPrefs,
  mergeDashboardLayouts,
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
  trackOverview: null,
  screenViews: [],
  screenDwell: [],
  buttonClicks: [],
  perfP50: [],
  perfP95: [],
  webVitalP50: [],
  webVitalP95: [],
  crashes: null,
};

function withoutWebPerf(items: { dimKey: string; dimValue: string; metricValue: number }[]) {
  return items.filter((item) => !item.dimValue.startsWith("cwv_"));
}

function withoutWebHome(items: { dimKey: string; dimValue: string; metricValue: number }[]) {
  return items.filter((item) => item.dimValue !== "web_home");
}

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
  const isSuperAdmin = useAuthStore((state) => state.user?.role === 2);
  const [prefs, setPrefs] = useState<DashboardPrefsV1>(() => readDashboardPrefs());
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  /** 与 react-grid-layout 同步的最新 layouts；persist 时必须用它，不能读可能滞后的 prefsRef */
  const layoutsDraftRef = useRef<Layouts>(prefs.layouts as Layouts);

  useEffect(() => {
    layoutsDraftRef.current = prefs.layouts as Layouts;
  }, [prefs.layouts]);

  const [data, setData] = useState<DashboardGridData>(EMPTY_DATA);
  const [coreLoading, setCoreLoading] = useState(true);
  const [trackLoading, setTrackLoading] = useState(true);
  const [crashLoading, setCrashLoading] = useState(false);
  const [coreError, setCoreError] = useState<string | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [crashPage, setCrashPage] = useState(1);

  const loadCore = useEffectEvent(async (range: GrowthRange, silent = false) => {
    if (!silent) {
      setCoreLoading(true);
      setCoreError(null);
    }
    try {
      const [overview, growth, distribution] = await Promise.all([
        fetchDashboardOverview(),
        fetchUserGrowth(range),
        fetchUserDistribution(),
      ]);
      setData((prev) => ({ ...prev, overview, growth, distribution }));
      if (silent) setCoreError(null);
    } catch (err) {
      if (!silent) setCoreError(messageFromError(err, false));
    } finally {
      if (!silent) setCoreLoading(false);
    }
  });

  const loadTrack = useEffectEvent(async (page: number, silent = false) => {
    if (!silent) {
      setTrackLoading(true);
      setTrackError(null);
    }
    try {
      const [trackOverview, screens, dwell, buttons, p50, p95, webP50, webP95, crashes] =
        await Promise.all([
          fetchTrackOverview(),
          fetchTrackDims("screen_views"),
          fetchTrackDims("screen_dwell_avg"),
          fetchTrackDims("button_clicks"),
          fetchTrackDims("perf_p50"),
          fetchTrackDims("perf_p95"),
          fetchTrackDims("perf_p50", undefined, { platform: "web", namePrefix: "cwv_" }),
          fetchTrackDims("perf_p95", undefined, { platform: "web", namePrefix: "cwv_" }),
          fetchTrackCrashes(page, 10),
        ]);
      setData((prev) => ({
        ...prev,
        trackOverview,
        screenViews: withoutWebHome(screens.items),
        screenDwell: withoutWebHome(dwell.items),
        buttonClicks: buttons.items,
        perfP50: withoutWebPerf(p50.items),
        perfP95: withoutWebPerf(p95.items),
        webVitalP50: webP50.items,
        webVitalP95: webP95.items,
        crashes,
      }));
      if (silent) setTrackError(null);
    } catch (err) {
      if (!silent) setTrackError(messageFromError(err, true));
    } finally {
      if (!silent) setTrackLoading(false);
    }
  });

  useEffect(() => {
    void loadCore(prefs.growthRange);
    void loadTrack(crashPage);
  }, []);

  useForegroundRefresh(
    () => {
      void loadCore(prefsRef.current.growthRange, true);
      void loadTrack(crashPage, true);
    },
    { intervalMs: FOREGROUND_REFRESH_INTERVAL_MS },
  );

  function persistPrefs(next: DashboardPrefsV1) {
    setPrefs(next);
    writeDashboardPrefs(next);
  }

  function handleLayoutsChange(layouts: Layouts) {
    const merged = mergeDashboardLayouts(prefsRef.current.layouts, layouts);
    layoutsDraftRef.current = merged as Layouts;
    setPrefs((prev) => ({ ...prev, layouts: merged }));
  }

  function handleLayoutPersist() {
    const merged = mergeDashboardLayouts(prefsRef.current.layouts, layoutsDraftRef.current);
    const next: DashboardPrefsV1 = {
      ...prefsRef.current,
      layouts: merged,
    };
    layoutsDraftRef.current = merged as Layouts;
    prefsRef.current = next;
    setPrefs(next);
    writeDashboardPrefs(next);
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
    <PageFrame
      bare
      className="max-w-[1600px]"
      title="数据大屏"
      description="查看运行状态与用户行为。宽屏可拖动画布卡片；窄屏仅纵向浏览。"
      actions={
        <>
          <Button onClick={handleRefresh}>刷新</Button>
          <Button onClick={handleResetLayout}>恢复默认布局</Button>
        </>
      }
    >
      <TrackSampleRateBar visible={isSuperAdmin} />
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
    </PageFrame>
  );
}
