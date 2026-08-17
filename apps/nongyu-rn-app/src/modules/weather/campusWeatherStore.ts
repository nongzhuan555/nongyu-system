import { create } from "zustand";
import type { SessionProfile } from "@/stores/session";
import { resolveSicauCampus, type SicauCampusId } from "./campusMap";
import { fetchCampusWeather } from "./fetchCampusWeather";

export type CampusWeatherStatus = "idle" | "loading" | "ready" | "error";

type CampusWeatherState = {
  status: CampusWeatherStatus;
  /** 防止并发重复请求 */
  inFlight: boolean;
  campusId: SicauCampusId | null;
  campusLabel: string | null;
  weatherCode: number | null;
  isRaining: boolean;
  errorMessage: string | null;
  lastFetchedAt: number | null;
  /**
   * 按当前档案拉一次校区天气（可重复调用；并发时忽略后来者）
   */
  refreshFromProfile: (profile: SessionProfile) => Promise<void>;
};

/**
 * 校区天气（内存态；按进入 App / 前台定时 / 开关切换刷新）
 */
export const useCampusWeatherStore = create<CampusWeatherState>((set, get) => ({
  status: "idle",
  inFlight: false,
  campusId: null,
  campusLabel: null,
  weatherCode: null,
  isRaining: false,
  errorMessage: null,
  lastFetchedAt: null,

  refreshFromProfile: async (profile) => {
    if (get().inFlight) return;

    set({ inFlight: true, status: "loading", errorMessage: null });

    const campus = resolveSicauCampus({
      campus: profile.campus,
      college: profile.college,
    });

    try {
      const snap = await fetchCampusWeather(campus);
      set({
        inFlight: false,
        status: "ready",
        campusId: snap.campusId,
        campusLabel: snap.campusLabel,
        weatherCode: snap.weatherCode,
        isRaining: snap.isRaining,
        errorMessage: null,
        lastFetchedAt: Date.now(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "天气获取失败";
      set({
        inFlight: false,
        status: "error",
        campusId: campus.id,
        campusLabel: campus.label,
        weatherCode: null,
        isRaining: false,
        errorMessage: msg,
        lastFetchedAt: Date.now(),
      });
    }
  },
}));
