import { isRainWeatherCode, type SicauCampusInfo } from "./campusMap";

type OpenMeteoCurrentResponse = {
  current?: {
    weather_code?: number;
  };
};

export type CampusWeatherSnapshot = {
  campusId: SicauCampusInfo["id"];
  campusLabel: string;
  weatherCode: number | null;
  isRaining: boolean;
};

/**
 * 按校区坐标拉取 Open-Meteo 当前天气（免 key）
 */
export async function fetchCampusWeather(campus: SicauCampusInfo): Promise<CampusWeatherSnapshot> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${campus.latitude}` +
    `&longitude=${campus.longitude}` +
    `&current=weather_code` +
    `&timezone=Asia%2FShanghai`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`天气请求失败 HTTP ${res.status}`);
  }

  const data = (await res.json()) as OpenMeteoCurrentResponse;
  const code = data.current?.weather_code;
  const weatherCode = typeof code === "number" && Number.isFinite(code) ? code : null;

  return {
    campusId: campus.id,
    campusLabel: campus.label,
    weatherCode,
    isRaining: weatherCode !== null ? isRainWeatherCode(weatherCode) : false,
  };
}
