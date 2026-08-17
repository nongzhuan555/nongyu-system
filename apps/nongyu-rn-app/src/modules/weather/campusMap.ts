/**
 * 川农三校区与学院映射（2026-08 整理）
 * 天气请求使用固定经纬度，不依赖设备定位
 */

export type SicauCampusId = "yaan" | "chengdu" | "dujiangyan";

export type SicauCampusInfo = {
  id: SicauCampusId;
  label: string;
  address: string;
  /** Open-Meteo 用 */
  latitude: number;
  longitude: number;
};

export const SICAU_CAMPUSES: Record<SicauCampusId, SicauCampusInfo> = {
  yaan: {
    id: "yaan",
    label: "雅安校区",
    address: "四川省雅安市雨城区新康路46号",
    latitude: 29.9812,
    longitude: 103.0054,
  },
  chengdu: {
    id: "chengdu",
    label: "成都校区",
    address: "四川省成都市温江区惠民路211号",
    latitude: 30.7055,
    longitude: 103.8702,
  },
  dujiangyan: {
    id: "dujiangyan",
    label: "都江堰校区",
    address: "四川省成都市都江堰市建设路288号",
    latitude: 31.0031,
    longitude: 103.6274,
  },
};

/** 默认校区（映射失败时） */
export const DEFAULT_CAMPUS_ID: SicauCampusId = "yaan";

/**
 * 学院名 → 校区（含常见简称别名）
 * 马克思主义学院按行政主体归雅安
 */
const COLLEGE_TO_CAMPUS: Record<string, SicauCampusId> = {
  // 雅安
  理学院: "yaan",
  生命科学学院: "yaan",
  机电学院: "yaan",
  食品学院: "yaan",
  信息工程学院: "yaan",
  水利水电学院: "yaan",
  人文学院: "yaan",
  公共管理学院: "yaan",
  法学院: "yaan",
  体育学院: "yaan",
  艺术与传媒学院: "yaan",
  艺术传媒学院: "yaan",
  远程与继续教育学院: "yaan",
  马克思主义学院: "yaan",
  // 成都
  农学院: "chengdu",
  动物科技学院: "chengdu",
  动物医学院: "chengdu",
  动物医学学院: "chengdu",
  草业科技学院: "chengdu",
  水产学院: "chengdu",
  林学院: "chengdu",
  园艺学院: "chengdu",
  风景园林学院: "chengdu",
  资源学院: "chengdu",
  环境学院: "chengdu",
  经济学院: "chengdu",
  管理学院: "chengdu",
  农业工程学院: "chengdu",
  国际学院: "chengdu",
  产业创新学院: "chengdu",
  // 都江堰
  建筑与城乡规划学院: "dujiangyan",
  建筑城乡学院: "dujiangyan",
  土木工程学院: "dujiangyan",
  商旅学院: "dujiangyan",
  基础教学部: "dujiangyan",
};

/**
 * 规范化学院/校区文案，便于匹配
 */
export function normalizeCampusText(raw: string | undefined | null): string {
  return (raw ?? "")
    .replace(/（[^）]*）/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, "")
    .trim();
}

/**
 * 从教务「校区」字段解析
 */
export function resolveCampusIdFromCampusField(campus: string | undefined): SicauCampusId | null {
  const text = normalizeCampusText(campus);
  if (!text) return null;
  if (text.includes("都江堰")) return "dujiangyan";
  if (text.includes("成都") || text.includes("温江")) return "chengdu";
  if (text.includes("雅安")) return "yaan";
  return null;
}

/**
 * 从学院名解析（精确 → 包含匹配）
 */
export function resolveCampusIdFromCollege(college: string | undefined): SicauCampusId | null {
  const text = normalizeCampusText(college);
  if (!text) return null;

  const exact = COLLEGE_TO_CAMPUS[text];
  if (exact) return exact;

  // 教务偶发带「四川农业大学」前缀或多余后缀
  for (const [name, id] of Object.entries(COLLEGE_TO_CAMPUS)) {
    if (text.includes(name) || name.includes(text)) return id;
  }
  return null;
}

export type ResolveCampusInput = {
  campus?: string;
  college?: string;
};

/**
 * 校区解析：campus 字段优先 → 学院映射 → 默认雅安
 */
export function resolveSicauCampus(input: ResolveCampusInput): SicauCampusInfo {
  const fromCampus = resolveCampusIdFromCampusField(input.campus);
  const fromCollege = resolveCampusIdFromCollege(input.college);
  const id = fromCampus ?? fromCollege ?? DEFAULT_CAMPUS_ID;
  return SICAU_CAMPUSES[id];
}

/**
 * Open-Meteo WMO weather_code 是否视为「雨类」
 * @see https://open-meteo.com/en/docs
 */
export function isRainWeatherCode(code: number): boolean {
  // 51–67 毛毛雨/雨；80–82 阵雨；95–99 雷暴（含水）
  if (code >= 51 && code <= 67) return true;
  if (code >= 80 && code <= 82) return true;
  if (code >= 95 && code <= 99) return true;
  return false;
}
