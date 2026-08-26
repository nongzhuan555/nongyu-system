import { getAppAccessToken } from "@/api/appToken";
import { appFetch } from "@/api/appClient";
import type { TrackEventType } from "./types";

/** 行为类事件受采样率约束；crash/heartbeat 始终上报 */
const BEHAVIOR_EVENT_TYPES = new Set<TrackEventType>([
  "app_open",
  "screen_view",
  "button_click",
  "perf",
]);

type SampleGateState = "pending" | "ready";

let gateState: SampleGateState = "pending";
/** 采样判定完成前视为全量；失败降级也为 true */
let sampledIn = true;

/**
 * 本进程内拉取一次采样率并做 session 判定；不因回前台重复拉。
 */
export function initTrackSampleRate(): void {
  gateState = "pending";
  sampledIn = true;
  void loadTrackSampleRate();
}

async function loadTrackSampleRate(): Promise<void> {
  if (!getAppAccessToken()) {
    gateState = "ready";
    sampledIn = true;
    return;
  }
  try {
    const data = await appFetch<{ sampleRate: number }>("/api/app/track/sample-rate");
    const rate = Number(data.sampleRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      gateState = "ready";
      sampledIn = true;
      return;
    }
    sampledIn = rate >= 100 || Math.random() * 100 < rate;
    gateState = "ready";
  } catch {
    // 任意失败降级为本进程 100% 采样
    gateState = "ready";
    sampledIn = true;
  }
}

/** 是否允许行为类事件入队 */
export function shouldEnqueueTrackEvent(eventType: TrackEventType): boolean {
  if (!BEHAVIOR_EVENT_TYPES.has(eventType)) return true;
  if (gateState === "pending") return true;
  return sampledIn;
}
