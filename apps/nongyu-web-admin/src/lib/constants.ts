export const ROUTES = {
  login: "/login",
  workspace: "/workspace",
  dashboard: "/dashboard",
  users: "/users",
  content: "/content",
} as const;

export const STORAGE_SESSION_KEY = "nongyu-admin:v1:session";
export const STORAGE_REMEMBER_STUDENT_NO_KEY = "nongyu-admin:v1:rememberedStudentNo";
export const STORAGE_DASHBOARD_PREFS_KEY = "nongyu.admin.dashboard.layout.v1";

export const ADMIN_LOGIN_PATH = "/api/admin/auth/login";
export const ADMIN_ME_PATH = "/api/admin/auth/me";
export const ADMIN_LOGOUT_PATH = "/api/admin/auth/logout";
export const ADMIN_PASSWORD_PATH = "/api/admin/auth/password";
export const ADMIN_USERS_PATH = "/api/admin/users";
export const ADMIN_POSTS_PATH = "/api/admin/posts";
export const ADMIN_DASHBOARD_OVERVIEW_PATH = "/api/admin/dashboard/overview";
export const ADMIN_DASHBOARD_GROWTH_PATH = "/api/admin/dashboard/user-growth";
export const ADMIN_DASHBOARD_DISTRIBUTION_PATH = "/api/admin/dashboard/user-distribution";
export const ADMIN_DASHBOARD_SETTINGS_PATH = "/api/admin/dashboard/settings-distribution";
export const ADMIN_TRACK_OVERVIEW_PATH = "/api/admin/track/overview";
export const ADMIN_TRACK_DIMS_PATH = "/api/admin/track/dims";
export const ADMIN_TRACK_CRASHES_PATH = "/api/admin/track/crashes";

export const STUDENT_NO_PATTERN = /^\d{9}$/;
export const DEFAULT_USER_PAGE_SIZE = 20;
export const DEFAULT_POST_PAGE_SIZE = 20;

export const AUTH_ERROR_CODES = {
  VALIDATION: 40001,
  UNAUTHORIZED: 40101,
  TOKEN_INVALID: 40102,
  TOKEN_EXPIRED: 40103,
  TOKEN_REVOKED: 40104,
  ACCOUNT_DISABLED: 40301,
  ADMIN_REQUIRED: 40302,
  ADMIN_PASSWORD_WRONG: 40303,
  USER_NOT_FOUND: 40401,
  TRACK_BAD_GATEWAY: 50201,
  TRACK_UNAVAILABLE: 50301,
  INTERNAL: 50000,
} as const;
