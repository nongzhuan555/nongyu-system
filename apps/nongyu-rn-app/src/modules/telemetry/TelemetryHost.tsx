import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { usePathname } from "expo-router";
import { useSessionStore } from "@/stores/session";
import { enqueue, flushPending } from "./client";

const FLUSH_MS = 10_000;
const HEARTBEAT_MS = 60_000;

/** 进程内是否已打过 app_open，避免 Strict Mode 双挂载重复 cold_start */
let processDidOpen = false;

/**
 * 已登录时驱动 app_open / screen_view / heartbeat / 定时 flush
 */
export function TelemetryHost() {
  const pathname = usePathname();
  const token = useSessionStore((s) => s.token);
  const hydrated = useSessionStore((s) => s.hydrated);
  const lastPath = useRef<string | null>(null);

  const canTrack = hydrated && Boolean(token);

  useEffect(() => {
    if (!canTrack) {
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
    if (!pathname || pathname === "/login") return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    enqueue({ event_type: "screen_view", event_name: pathname });
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
      if (next === "active" || next === "background") {
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
