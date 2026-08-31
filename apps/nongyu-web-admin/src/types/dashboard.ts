export type GrowthRange = "7d" | "30d" | "90d" | "180d" | "365d";

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
  campus: DistKeyCount[];
  college: DistKeyCount[];
  grade: DistKeyCount[];
  deviceBrand: DistKeyCount[];
};

export type SettingsDistribution = {
  theme: DistKeyCount[];
  homeIsTimetable: DistKeyCount[];
  openWebInApp: DistKeyCount[];
  agentEnabled: DistKeyCount[];
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
  date: string;
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
  layouts: Partial<Record<GridBreakpoint, GridItemLayout[]>>;
};
