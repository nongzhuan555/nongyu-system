import NetInfo from "@react-native-community/netinfo";
import { getAppAccessToken } from "@/api/appToken";
import { getTrackContext } from "./context";
import { newEventId } from "./ids";
import { appendQueue, prependQueue, takeBatch } from "./queue";
import { settleScreenDwell } from "./screenDwell";
import { shouldEnqueueTrackEvent } from "./sampleRate";
import { postTrackEvents, postTrackOffline } from "./transport";
import type { TrackEvent, TrackEventInput } from "./types";

const BATCH_SIZE = 40;

let flushing = false;

/**
 * 入队一条事件；无 JWT 时直接丢弃（无法鉴权上报）
 */
export function enqueue(input: TrackEventInput): void {
  if (!getAppAccessToken()) return;
  if (!shouldEnqueueTrackEvent(input.event_type)) return;
  const ctx = getTrackContext();
  const event: TrackEvent = {
    event_id: newEventId(),
    event_type: input.event_type,
    event_name: input.event_name,
    client_ts_ms: Date.now(),
    session_id: ctx.session_id,
    app_version: ctx.app_version,
    platform: ctx.platform,
    device_brand: ctx.device_brand,
    duration_ms: input.duration_ms,
    props: sanitizeProps(input.props),
  };
  const size = appendQueue([event]);
  // 与 Spec「队列达批即 flush」对齐；未满批仍靠 Host 10s 定时
  if (size >= BATCH_SIZE) {
    void flushPending();
  }
}

/**
 * 尝试把积压批次发给 Track；失败原包回队列
 */
export async function flushPending(): Promise<void> {
  if (flushing) return;
  if (!getAppAccessToken()) return;

  const net = await NetInfo.fetch();
  if (net.isConnected === false) return;

  flushing = true;
  try {
    while (true) {
      const batch = takeBatch(BATCH_SIZE);
      if (batch.length === 0) return;
      try {
        await postTrackEvents(batch);
      } catch {
        prependQueue(batch);
        return;
      }
    }
  } finally {
    flushing = false;
  }
}

/**
 * 登出前：结算当前页停留，尽量把队列发出并通知离线
 */
export async function shutdownForLogout(): Promise<void> {
  try {
    const leave = settleScreenDwell("logout");
    if (leave) enqueue(leave);
  } catch {
    // 停留结算失败不得挡住登出
  }
  try {
    await flushPending();
  } catch {
    // 登出不能被埋点失败挡住
  }
  try {
    await postTrackOffline();
  } catch {
    // 依赖服务端约 10 分钟超时扫描
  }
}

function sanitizeProps(
  props: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!props) return undefined;
  const blocked = /^(password|pwd|token|accesstoken|refreshtoken|cookie|authorization)$/i;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (blocked.test(key)) continue;
    out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
