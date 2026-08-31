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

function trackUrl(): string {
  return (import.meta.env.VITE_TRACK_WEB_URL as string | undefined)?.trim() ?? "";
}

function siteKey(): string {
  return (import.meta.env.VITE_TRACK_WEB_SITE_KEY as string | undefined)?.trim() ?? "";
}

export function rumConfigured(): boolean {
  return Boolean(trackUrl() && siteKey());
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
