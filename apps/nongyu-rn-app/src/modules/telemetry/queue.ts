import { appStorage } from "@/storage/mmkv";
import type { TrackEvent } from "./types";

const QUEUE_KEY = "telemetry:pending_v1";
const MAX_QUEUE = 300;

/**
 * 从 MMKV 读取待上报队列；损坏数据直接丢弃以免永久卡死
 */
export function loadQueue(): TrackEvent[] {
  const raw = appStorage.getString(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isTrackEvent);
  } catch {
    appStorage.delete(QUEUE_KEY);
    return [];
  }
}

/**
 * 追加事件；超出上限丢掉最旧的，避免磁盘膨胀。
 * @returns 持久化后的队列长度（供满批触发 flush）
 */
export function appendQueue(events: TrackEvent[]): number {
  if (events.length === 0) return loadQueue().length;
  const merged = [...loadQueue(), ...events];
  const trimmed = merged.length > MAX_QUEUE ? merged.slice(merged.length - MAX_QUEUE) : merged;
  persist(trimmed);
  return trimmed.length;
}

/**
 * 取出一批待发事件，并从持久化队列移除
 */
export function takeBatch(limit: number): TrackEvent[] {
  const all = loadQueue();
  if (all.length === 0) return [];
  const batch = all.slice(0, limit);
  persist(all.slice(batch.length));
  return batch;
}

/**
 * 发送失败时把批次插回队头，保持原 event_id 以便幂等
 */
export function prependQueue(events: TrackEvent[]): void {
  if (events.length === 0) return;
  const merged = [...events, ...loadQueue()];
  const trimmed = merged.length > MAX_QUEUE ? merged.slice(0, MAX_QUEUE) : merged;
  persist(trimmed);
}

function persist(events: TrackEvent[]): void {
  if (events.length === 0) {
    appStorage.delete(QUEUE_KEY);
    return;
  }
  appStorage.set(QUEUE_KEY, JSON.stringify(events));
}

function isTrackEvent(value: unknown): value is TrackEvent {
  if (!value || typeof value !== "object") return false;
  const row = value as TrackEvent;
  return Boolean(row.event_id && row.event_type && row.event_name);
}
