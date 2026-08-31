import { rumConfigured, sendTrackEvents } from "./beacon";
import { appVersion, getSessionId, newEventId } from "./session";

/** 每次完整进入/刷新上报 1 次官网 PV。 */
export function reportPageView(): void {
  if (!rumConfigured()) return;
  sendTrackEvents([
    {
      event_id: newEventId(),
      event_type: "screen_view",
      event_name: "web_home",
      client_ts_ms: Date.now(),
      session_id: getSessionId(),
      app_version: appVersion(),
      platform: "web",
      props: {
        path: typeof location !== "undefined" ? location.pathname || "/" : "/",
      },
    },
  ]);
}
