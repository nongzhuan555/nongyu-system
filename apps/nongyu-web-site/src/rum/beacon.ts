type RumRuntimeConfig = {
  url?: string;
  siteKey?: string;
};

declare global {
  interface Window {
    __NONGYU_RUM__?: RumRuntimeConfig;
  }
}

type TrackWebEvent = {
  event_id: string;
  event_type: string;
  event_name: string;
  client_ts_ms: number;
  session_id: string;
  app_version: string;
  platform: "web";
  duration_ms?: number;
  props?: Record<string, unknown>;
};

/** 生产默认走官网同源反代，避免跨域 CORS；需 Nginx `location /v1/track/web/`。 */
const DEFAULT_TRACK_WEB_URL = "/v1/track/web/events";

let warnedMissingConfig = false;

function runtimeConfig(): RumRuntimeConfig {
  if (typeof window === "undefined") return {};
  return window.__NONGYU_RUM__ ?? {};
}

function trackUrl(): string {
  const fromRuntime = runtimeConfig().url?.trim();
  if (fromRuntime) return fromRuntime;
  const fromEnv = (import.meta.env.VITE_TRACK_WEB_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv;
  return DEFAULT_TRACK_WEB_URL;
}

function siteKey(): string {
  const fromRuntime = runtimeConfig().siteKey?.trim();
  if (fromRuntime) return fromRuntime;
  return (import.meta.env.VITE_TRACK_WEB_SITE_KEY as string | undefined)?.trim() ?? "";
}

export function rumConfigured(): boolean {
  const ok = Boolean(trackUrl() && siteKey());
  if (!ok && !warnedMissingConfig) {
    warnedMissingConfig = true;
    console.warn(
      "[nongyu-rum] Site Key 未配置（VITE_TRACK_WEB_SITE_KEY 或 rum-config.js），跳过官网埋点",
    );
  }
  return ok;
}

/** 优先 fetch keepalive（可带自定义头）；失败再尝试 sendBeacon。 */
export function sendTrackEvents(events: TrackWebEvent[]): void {
  if (!rumConfigured() || events.length === 0) return;
  const url = trackUrl();
  const body = JSON.stringify({ events });
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Site-Key": siteKey(),
  };

  void fetch(url, {
    method: "POST",
    headers,
    body,
    keepalive: true,
    mode: "cors",
    credentials: "omit",
  }).catch(() => {
    try {
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon(url, blob);
      }
    } catch {
      /* 静默 */
    }
  });
}

export type { TrackWebEvent };
