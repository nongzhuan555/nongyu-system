import type { Logger } from "pino";
import { shanghaiHourMinute, statDate, yesterday } from "../bizday.js";
import type { Store } from "../store/sqlite/db.js";
import {
  avgScreenDwell,
  bumpPeak,
  countByName,
  countByType,
  countDistinctDAU,
  countScreenEnters,
  jobStatus,
  percentile,
  perfDurations,
  purgeEvents,
  recordJob,
  replaceDims,
  upsertMetric,
} from "../store/sqlite/metrics.js";
import { countOnline } from "../store/sqlite/presence.js";

export class Jobs {
  private stopped = false;
  private loopPromise: Promise<void> | null = null;
  private lastAggMin = -1;
  private lastPurgeMin = -1;
  now: () => Date = () => new Date();

  constructor(
    private store: Store,
    private log: Logger,
  ) {}

  start(): void {
    this.loopPromise = this.loop();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.loopPromise) await this.loopPromise;
  }

  private async loop(): Promise<void> {
    this.startupBackfill();
    while (!this.stopped) {
      await sleep(30_000);
      if (this.stopped) break;
      this.tick();
    }
  }

  private startupBackfill(): void {
    const date = yesterday(this.now());
    try {
      const st = jobStatus(this.store, "aggregate_daily", `stat_date=${date}`);
      if (st.ok && st.status === "success") return;
      void this.runAggregate(date);
    } catch (err) {
      this.log.error({ err, date }, "startup aggregate failed");
    }
  }

  private tick(): void {
    const now = this.now();
    const { hour, minute } = shanghaiHourMinute(now);
    const minuteOfDay = hour * 60 + minute;

    if (hour === 0 && minute === 10 && this.lastAggMin !== minuteOfDay) {
      this.lastAggMin = minuteOfDay;
      const date = yesterday(now);
      try {
        this.runAggregate(date);
      } catch (err) {
        this.log.error({ err, date }, "scheduled aggregate failed");
      }
    }
    if (hour === 3 && minute === 0 && this.lastPurgeMin !== minuteOfDay) {
      this.lastPurgeMin = minuteOfDay;
      try {
        this.runPurge();
      } catch (err) {
        this.log.error({ err }, "scheduled purge failed");
      }
    }

    try {
      const n = countOnline(this.store);
      bumpPeak(this.store, statDate(now), n, now.getTime());
    } catch (err) {
      this.log.warn({ err }, "online peak bump failed");
    }
  }

  runAggregate(date: string): { status: string } {
    const key = `stat_date=${date}`;
    const nowMs = this.now().getTime();
    try {
      this.store.withWriteTx(() => {
        const appOnly = { excludePlatform: "web" as const };
        const dau = countDistinctDAU(this.store, date);
        const appOpen = countByType(this.store, date, "app_open");
        const screensAll = countByType(this.store, date, "screen_view");
        const webScreens = countByType(this.store, date, "screen_view", "web");
        const screens = screensAll - webScreens;
        const clicks = countByType(this.store, date, "button_click");
        const crashes = countByType(this.store, date, "crash");
        upsertMetric(this.store, date, "dau", dau, nowMs);
        upsertMetric(this.store, date, "app_open_count", appOpen, nowMs);
        upsertMetric(this.store, date, "screen_view_count", screens, nowMs);
        upsertMetric(this.store, date, "button_click_count", clicks, nowMs);
        upsertMetric(this.store, date, "crash_count", crashes, nowMs);

        replaceDims(
          this.store,
          date,
          "screen_views",
          nowMs,
          countScreenEnters(this.store, date, appOnly),
        );
        replaceDims(
          this.store,
          date,
          "screen_dwell_avg",
          nowMs,
          avgScreenDwell(this.store, date, appOnly),
        );
        replaceDims(
          this.store,
          date,
          "button_clicks",
          nowMs,
          countByName(this.store, date, "button_click", appOnly),
        );

        const perf = perfDurations(this.store, date, appOnly);
        const p50: Array<{ dimKey: string; dimValue: string; metricValue: number }> = [];
        const p95: Array<{ dimKey: string; dimValue: string; metricValue: number }> = [];
        for (const [name, vals] of perf) {
          const sorted = [...vals].sort((a, b) => a - b);
          p50.push({ dimKey: "name", dimValue: name, metricValue: percentile(sorted, 50) });
          p95.push({ dimKey: "name", dimValue: name, metricValue: percentile(sorted, 95) });
        }
        replaceDims(this.store, date, "perf_p50", nowMs, p50);
        replaceDims(this.store, date, "perf_p95", nowMs, p95);
      });
      recordJob(this.store, "aggregate_daily", key, "success", nowMs, "");
      return { status: "success" };
    } catch (err) {
      const detail = JSON.stringify({ error: err instanceof Error ? err.message : String(err) });
      try {
        recordJob(this.store, "aggregate_daily", key, "failed", nowMs, detail);
      } catch {
        /* ignore */
      }
      throw err;
    }
  }

  runPurge(): { deleted: number } {
    const cutoff = this.now().getTime() - 30 * 24 * 60 * 60 * 1000;
    const nowMs = this.now().getTime();
    const key = `at=${nowMs}`;
    try {
      const n = purgeEvents(this.store, cutoff);
      recordJob(this.store, "purge_events", key, "success", nowMs, JSON.stringify({ deleted: n }));
      return { deleted: n };
    } catch (err) {
      const detail = JSON.stringify({ error: err instanceof Error ? err.message : String(err) });
      try {
        recordJob(this.store, "purge_events", key, "failed", nowMs, detail);
      } catch {
        /* ignore */
      }
      throw err;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
