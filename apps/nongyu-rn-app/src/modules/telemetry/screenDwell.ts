import type { TrackEventInput } from "./types";

/** 过滤瞬时跳转 / Strict Mode 噪音 */
const MIN_DWELL_MS = 300;

export type DwellLeaveReason = "route" | "background" | "logout" | "teardown";

let dwellPath: string | null = null;
let dwellEnteredAtMs: number | null = null;

/**
 * 进入页：记时起点；调用方负责另报无 duration 的 enter 事件
 */
export function beginScreenDwell(pathname: string): void {
  dwellPath = pathname;
  dwellEnteredAtMs = Date.now();
}

/**
 * 结算可见停留，返回待入队事件（过短则 null）。
 * background 只停表并保留 path，便于回前台续计；其它 reason 清空 path。
 */
export function settleScreenDwell(reason: DwellLeaveReason): TrackEventInput | null {
  if (!dwellPath || dwellEnteredAtMs == null) {
    if (reason !== "background") {
      dwellPath = null;
      dwellEnteredAtMs = null;
    }
    return null;
  }

  const path = dwellPath;
  const durationMs = Date.now() - dwellEnteredAtMs;
  dwellEnteredAtMs = null;
  if (reason !== "background") {
    dwellPath = null;
  }

  if (durationMs < MIN_DWELL_MS) return null;

  return {
    event_type: "screen_view",
    event_name: path,
    duration_ms: durationMs,
    props: { phase: "leave", reason },
  };
}

/**
 * 从后台回前台：同一 path 续开计时，不重复打 enter
 */
export function resumeScreenDwell(): void {
  if (!dwellPath || dwellEnteredAtMs != null) return;
  dwellEnteredAtMs = Date.now();
}
