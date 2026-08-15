export const TRACK_EVENT_TYPES = [
  "screen_view",
  "button_click",
  "perf",
  "app_open",
  "heartbeat",
  "crash",
] as const;

export type TrackEventType = (typeof TRACK_EVENT_TYPES)[number];

/** 与 Track 接口文档对齐的单条事件（snake_case） */
export type TrackEvent = {
  event_id: string;
  event_type: TrackEventType;
  event_name: string;
  client_ts_ms: number;
  session_id: string;
  app_version: string;
  platform?: "ios" | "android";
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
