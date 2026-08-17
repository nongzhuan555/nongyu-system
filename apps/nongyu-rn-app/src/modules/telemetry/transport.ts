import { TRACK_BASE_URL } from "@/config/env";
import { getAppAccessToken } from "@/api/appToken";
import type { TrackEvent, TrackIngestResult } from "./types";

type TrackSuccess<T> = { ok: true; data: T };
type TrackFailure = { ok: false; error?: { code?: string; message?: string } };

/**
 * 直连 Track，不走 Node { code, message } 拦截器
 */
export async function postTrackEvents(events: TrackEvent[]): Promise<TrackIngestResult> {
  const token = getAppAccessToken();
  if (!token) {
    throw new Error("TRACK_NO_TOKEN");
  }

  const response = await fetch(`${TRACK_BASE_URL}/v1/track/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ events }),
  });

  const json = (await parseJson(response)) as TrackSuccess<TrackIngestResult> | TrackFailure | null;
  if (!response.ok || !json || json.ok !== true) {
    const fail = json && json.ok === false ? json : null;
    const err = new Error(fail?.error?.message || `TRACK_HTTP_${response.status}`);
    (err as Error & { status: number }).status = response.status;
    throw err;
  }
  return json.data;
}

/**
 * 登出前尽力通知离线；失败由调用方忽略
 */
export async function postTrackOffline(): Promise<void> {
  const token = getAppAccessToken();
  if (!token) return;

  const response = await fetch(`${TRACK_BASE_URL}/v1/track/presence/offline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (!response.ok) {
    throw new Error(`TRACK_OFFLINE_HTTP_${response.status}`);
  }
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
