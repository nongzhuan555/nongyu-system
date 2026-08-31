import type { Metric } from "web-vitals";
import { rumConfigured, sendTrackEvents, type TrackWebEvent } from "./beacon";
import { appVersion, getSessionId, newEventId } from "./session";

const NAME_MAP = {
  LCP: "cwv_lcp",
  INP: "cwv_inp",
  CLS: "cwv_cls",
  FCP: "cwv_fcp",
  TTFB: "cwv_ttfb",
} as const;

function durationMs(metric: Metric): number {
  if (metric.name === "CLS") return Math.round(metric.value * 1000);
  return Math.round(metric.value);
}

function toEvent(metric: Metric): TrackWebEvent {
  const eventName = NAME_MAP[metric.name as keyof typeof NAME_MAP];
  return {
    event_id: newEventId(),
    event_type: "perf",
    event_name: eventName,
    client_ts_ms: Date.now(),
    session_id: getSessionId(),
    app_version: appVersion(),
    platform: "web",
    duration_ms: durationMs(metric),
    props: {
      rating: metric.rating,
      navigation_type: metric.navigationType,
      raw_value: metric.value,
      path: typeof location !== "undefined" ? location.pathname || "/" : "/",
      id: metric.id,
    },
  };
}

function onMetric(metric: Metric): void {
  const mapped = NAME_MAP[metric.name as keyof typeof NAME_MAP];
  if (!mapped) return;
  sendTrackEvents([toEvent(metric)]);
}

/** 动态加载 web-vitals，注册 Core Web Vitals + FCP/TTFB。 */
export async function initWebVitals(): Promise<void> {
  if (!rumConfigured()) return;
  try {
    const { onCLS, onINP, onLCP, onFCP, onTTFB } = await import("web-vitals");
    onCLS(onMetric);
    onINP(onMetric);
    onLCP(onMetric);
    onFCP(onMetric);
    onTTFB(onMetric);
  } catch {
    /* 静默 */
  }
}
