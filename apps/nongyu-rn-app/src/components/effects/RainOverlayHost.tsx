import { RainOverlay } from "@/components/effects/RainOverlay";
import { useRainPrefsStore } from "@/modules/settings/store/rainPrefsStore";
import { useCampusWeatherStore } from "@/modules/weather/campusWeatherStore";

/**
 * 全局雨效 Host：用户开关开启且校区天气为雨时才显示
 */
export function RainOverlayHost() {
  const rainEnabled = useRainPrefsStore((s) => s.rainEnabled);
  const isRaining = useCampusWeatherStore((s) => s.isRaining);
  return <RainOverlay enabled={rainEnabled && isRaining} />;
}
