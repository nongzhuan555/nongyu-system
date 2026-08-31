import { TRACK_SERVER_EVENT_TYPES } from "nongyu-track-contract";

const maxPropsBytes = 4096;
const allowedTypes = new Set<string>(TRACK_SERVER_EVENT_TYPES);

export type RawEvent = {
  event_id?: string;
  event_type?: string;
  event_name?: string;
  client_ts_ms?: number | null;
  session_id?: string;
  app_version?: string;
  platform?: string;
  device_brand?: string;
  duration_ms?: number | null;
  student_no?: string;
  props?: unknown;
};

export type ItemError = {
  event_id: string;
  code: string;
  message?: string;
};

export type EventFields = {
  eventId: string;
  eventType: string;
  eventName: string;
  appVersion: string;
  platform: string;
  deviceBrand: string;
  sessionId: string;
  durationMs: number | null;
  propsJson: string;
  clientTsMs: number | null;
  studentNo: string;
};

function clipAny(v: unknown, max: number): string {
  const s = String(v);
  if ([...s].length <= max) return s;
  return [...s].slice(0, max).join("");
}

function normalizeProps(raw: unknown): string {
  if (raw === undefined || raw === null) return "";
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("invalid props");
  }
  const obj = raw as Record<string, unknown>;
  const b = JSON.stringify(obj);
  if (Buffer.byteLength(b, "utf8") <= maxPropsBytes) return b;
  const trimmed: Record<string, unknown> = {
    _truncated: true,
    _original_bytes: Buffer.byteLength(b, "utf8"),
  };
  if ("message" in obj) trimmed.message = clipAny(obj.message, 512);
  if ("stack" in obj) trimmed.stack = clipAny(obj.stack, 2048);
  return JSON.stringify(trimmed);
}

/** 校验单条事件；失败时返回 ItemError，不阻断整包。 */
export function validateOne(
  raw: RawEvent,
): { fields: EventFields; error?: undefined } | { fields?: undefined; error: ItemError } {
  const id = (raw.event_id ?? "").trim();
  if (!id) {
    return {
      error: { event_id: raw.event_id ?? "", code: "INVALID_EVENT", message: "event_id required" },
    };
  }
  const typ = (raw.event_type ?? "").trim();
  if (!allowedTypes.has(typ)) {
    return { error: { event_id: id, code: "INVALID_TYPE", message: "unknown event_type" } };
  }
  const name = (raw.event_name ?? "").trim();
  if (!name) {
    return { error: { event_id: id, code: "INVALID_EVENT", message: "event_name required" } };
  }
  const platform = (raw.platform ?? "").trim();
  if (platform && platform !== "ios" && platform !== "android" && platform !== "web") {
    return { error: { event_id: id, code: "INVALID_EVENT", message: "invalid platform" } };
  }

  let propsJson: string;
  try {
    propsJson = normalizeProps(raw.props);
  } catch {
    return { error: { event_id: id, code: "INVALID_EVENT", message: "invalid props" } };
  }

  const durationMs =
    raw.duration_ms === undefined || raw.duration_ms === null ? null : Number(raw.duration_ms);
  const clientTsMs =
    raw.client_ts_ms === undefined || raw.client_ts_ms === null ? null : Number(raw.client_ts_ms);

  return {
    fields: {
      eventId: id,
      eventType: typ,
      eventName: name,
      appVersion: (raw.app_version ?? "").trim(),
      platform,
      deviceBrand: (raw.device_brand ?? "").trim(),
      sessionId: (raw.session_id ?? "").trim(),
      durationMs: Number.isFinite(durationMs as number) ? (durationMs as number) : null,
      propsJson,
      clientTsMs: Number.isFinite(clientTsMs as number) ? (clientTsMs as number) : null,
      studentNo: (raw.student_no ?? "").trim(),
    },
  };
}
