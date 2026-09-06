export type GrowthRange = "7d" | "30d" | "90d" | "180d" | "365d";

/** 应用性能卡区间：今天 / 近 7 天 / 近 30 天 */
export type PerfRange = "1d" | "7d" | "30d";

export type DistKeyCount = {
  key: string;
  count: number;
};

export type DashboardOverview = {
  totalUsers: number;
  totalAdmins: number;
  onlineUsers: number;
  todayNewUsers: number;
};

export type UserGrowth = {
  points: { date: string; newUsers: number }[];
};

export type UserDistribution = {
  gender: DistKeyCount[];
  /** 后端仍返回；管理端大屏暂不展示（见 Spec 隐藏校区与移动端布局优化） */
  campus: DistKeyCount[];
  college: DistKeyCount[];
  grade: DistKeyCount[];
  deviceBrand: DistKeyCount[];
};

export type TrackOverview = {
  date: string;
  dau: number;
  crashCount: number;
  appOpenCount: number;
  screenViewCount: number;
  buttonClickCount?: number;
  webScreenViewCount?: number;
};

export type TrackDimItem = {
  dimKey: string;
  dimValue: string;
  metricValue: number;
};

export type TrackDims = {
  date?: string;
  from?: string;
  to?: string;
  metric: string;
  items: TrackDimItem[];
};

export type TrackCrashItem = {
  eventId: string;
  userId: number | null;
  studentNo: string | null;
  eventName: string;
  appVersion: string | null;
  platform: string | null;
  deviceBrand: string | null;
  clientTsMs: number | null;
  receivedAtMs: number;
  statDate: string;
  props: Record<string, unknown> | null;
};

export type TrackCrashPage = {
  list: TrackCrashItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type TrackTrend = {
  points: { date: string; value: number }[];
};

export type TrackSqlQueryResult = {
  sql: string;
  columns: string[];
  rows: Record<string, unknown>[];
  truncated: boolean;
  rowCount: number;
};

export type ActiveDaysRankingLimit = 50 | 100 | 200;

export type ActiveDaysRankingItem = {
  id: number;
  studentNo: string;
  name: string;
  activeDays: number;
};

export type ActiveDaysRanking = {
  list: ActiveDaysRankingItem[];
  limit: ActiveDaysRankingLimit;
  order: "asc" | "desc";
};

export type GridBreakpoint = "lg" | "md" | "xs";

export type GridItemLayout = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

export type DashboardPrefsV1 = {
  version: 1;
  growthRange: GrowthRange;
  /** 应用性能卡区间；缺省视为 1d */
  perfRange?: PerfRange;
  layouts: Partial<Record<GridBreakpoint, GridItemLayout[]>>;
};
