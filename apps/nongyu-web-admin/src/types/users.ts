export type UserRole = 0 | 1 | 2;
export type UserStatus = 0 | 1;
export type Gender = 0 | 1 | 2;

export type AdminUserListItem = {
  id: number;
  studentNo: string;
  name: string;
  college: string | null;
  grade: string | null;
  campus: string | null;
  role: UserRole;
  status: UserStatus;
  isOnline: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export type UserSettingsSummary = {
  theme: string;
  homeIsTimetable: boolean;
  openWebInApp: boolean;
  agentEnabled: boolean;
  highlightTodayColumn: boolean;
  courseCardColorMode: string;
  courseCardUnifiedColor: string | null;
  semesterStartDate: string | null;
  timetableBgUri: string | null;
  updatedAt: string;
};

export type AdminUserDetail = {
  id: number;
  studentNo: string;
  name: string;
  major: string | null;
  college: string | null;
  className: string | null;
  grade: string | null;
  gender: Gender;
  hometown: string | null;
  campus: string | null;
  qq: string | null;
  role: UserRole;
  createdAt: string;
  status: UserStatus;
  isOnline: boolean;
  lastActiveAt: string | null;
  lastLoginAt: string | null;
  deviceBrand: string | null;
  deviceModel: string | null;
  deviceOs: string | null;
  currentDeviceId: string | null;
  settings: UserSettingsSummary;
};

export type PageResult<T> = {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminUserListQuery = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  role?: UserRole;
  status?: UserStatus;
};

export type PatchAdminUserBody = {
  role?: 0 | 1;
  status?: UserStatus;
};
