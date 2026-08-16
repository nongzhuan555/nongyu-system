import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { usePathname } from "expo-router";
import { useSessionStore } from "@/stores/session";
import { enqueue, flushPending } from "./client";
import { beginScreenDwell, resumeScreenDwell, settleScreenDwell } from "./screenDwell";

const FLUSH_MS = 10_000;
const HEARTBEAT_MS = 60_000;

/** 进程内是否已打过 app_open，避免 Strict Mode 双挂载重复 cold_start */
let processDidOpen = false;

function isTrackablePath(pathname: string | null | undefined): pathname is string {
  return Boolean(pathname && pathname !== "/login");
}

function enqueueLeave(reason: "route" | "background" | "teardown"): void {
  const leave = settleScreenDwell(reason);
  if (leave) enqueue(leave);
}

/**
 * 已登录时驱动 app_open / screen_view（含停留）/ heartbeat / 定时 flush
 */
export function TelemetryHost() {
  const pathname = usePathname();
  const token = useSessionStore((s) => s.token);
  const hydrated = useSessionStore((s) => s.hydrated);
  const lastPath = useRef<string | null>(null);

  const canTrack = hydrated && Boolean(token);

  useEffect(() => {
    if (!canTrack) {
      enqueueLeave("teardown");
      lastPath.current = null;
      return;
    }

    enqueue({
      event_type: "app_open",
      event_name: processDidOpen ? "session_start" : "cold_start",
    });
    processDidOpen = true;
    void flushPending();
  }, [canTrack]);

  useEffect(() => {
    if (!canTrack) return;
    if (!isTrackablePath(pathname)) {
      if (lastPath.current) {
        enqueueLeave("route");
        lastPath.current = null;
      }
      return;
    }
    if (lastPath.current === pathname) return;

    if (lastPath.current) {
      enqueueLeave("route");
    }

    lastPath.current = pathname;
    enqueue({
      event_type: "screen_view",
      event_name: pathname,
      props: { phase: "enter" },
    });
    beginScreenDwell(pathname);
  }, [canTrack, pathname]);

  useEffect(() => {
    if (!canTrack) return;

    const flushTimer = setInterval(() => {
      void flushPending();
    }, FLUSH_MS);

    const beat = () => {
      enqueue({ event_type: "heartbeat", event_name: "heartbeat" });
      void flushPending();
    };
    beat();
    const heartTimer = setInterval(beat, HEARTBEAT_MS);

    const onAppState = (next: AppStateStatus) => {
      if (next === "background") {
        enqueueLeave("background");
        enqueue({
          event_type: "heartbeat",
          event_name: "heartbeat",
          props: { app_state: next },
        });
        void flushPending();
        return;
      }
      if (next === "active") {
        resumeScreenDwell();
        enqueue({
          event_type: "heartbeat",
          event_name: "heartbeat",
          props: { app_state: next },
        });
        void flushPending();
      }
    };
    const sub = AppState.addEventListener("change", onAppState);

    return () => {
      clearInterval(flushTimer);
      clearInterval(heartTimer);
      sub.remove();
    };
  }, [canTrack]);

  return null;
}
