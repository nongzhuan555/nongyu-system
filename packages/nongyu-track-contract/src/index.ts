/** App SDK 允许的事件类型（不含仅服务端/内部使用的扩展类型） */
export const TRACK_EVENT_TYPES = [
  "screen_view",
  "button_click",
  "perf",
  "app_open",
  "heartbeat",
  "crash",
] as const;

export type TrackEventType = (typeof TRACK_EVENT_TYPES)[number];

export const TRACK_PLATFORMS = ["ios", "android", "web"] as const;
export type TrackPlatform = (typeof TRACK_PLATFORMS)[number];

/** 官网 Web ingest 允许的 (event_type, event_name) */
export const TRACK_WEB_INGEST_ALLOWLIST = [
  { event_type: "perf", event_name: "cwv_lcp" },
  { event_type: "perf", event_name: "cwv_inp" },
  { event_type: "perf", event_name: "cwv_cls" },
  { event_type: "perf", event_name: "cwv_fcp" },
  { event_type: "perf", event_name: "cwv_ttfb" },
  { event_type: "screen_view", event_name: "web_home" },
] as const;

export type TrackWebAllowItem = (typeof TRACK_WEB_INGEST_ALLOWLIST)[number];

export function isTrackWebAllowlisted(eventType: string, eventName: string): boolean {
  return TRACK_WEB_INGEST_ALLOWLIST.some(
    (x) => x.event_type === eventType && x.event_name === eventName,
  );
}

/** 与 Track 接口文档对齐的单条事件（snake_case） */
export type TrackEvent = {
  event_id: string;
  event_type: TrackEventType;
  event_name: string;
  client_ts_ms: number;
  session_id: string;
  app_version: string;
  platform?: TrackPlatform;
  device_brand?: string;
  duration_ms?: number;
  props?: Record<string, unknown>;
};

export type TrackEventInput = {
  event_type: TrackEventType;
  event_name: string;
  duration_ms?: number;
  props?: Record<string, unknown>;
};

export type TrackIngestResult = {
  accepted: number;
  duplicated: number;
  rejected: number;
  errors: Array<{ event_id: string; code: string; message?: string }>;
};

/** Track 服务端/内部写入允许的事件类型（含 llm_proxy_fail） */
export const TRACK_SERVER_EVENT_TYPES = [...TRACK_EVENT_TYPES, "llm_proxy_fail"] as const;

export type TrackServerEventType = (typeof TRACK_SERVER_EVENT_TYPES)[number];
