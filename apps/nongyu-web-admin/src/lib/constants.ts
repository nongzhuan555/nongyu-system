export const ROUTES = {
  login: "/login",
  workspace: "/workspace",
  dashboard: "/dashboard",
  users: "/users",
  content: "/content",
  homeGreetings: "/home-greetings",
  llmKeys: "/llm-keys",
  versions: "/versions",
} as const;

/** Pushy 控制台 / 官网（管理端版本管理页 iframe） */
export const PUSHY_CONSOLE_URL = "https://pushy.reactnative.cn/";

export const STORAGE_SESSION_KEY = "nongyu-admin:v1:session";
export const STORAGE_REMEMBER_STUDENT_NO_KEY = "nongyu-admin:v1:rememberedStudentNo";
export const STORAGE_DASHBOARD_PREFS_KEY = "nongyu.admin.dashboard.layout.v1";
export const STORAGE_AGENT_CONFIG_KEY = "nongyu-admin:v1:agent-config";

export function assistantSessionsKey(adminUserId: number): string {
  return `nongyu-admin:v1:assistant-sessions:${adminUserId}`;
}

export const ADMIN_LOGIN_PATH = "/api/admin/auth/login";
export const ADMIN_ME_PATH = "/api/admin/auth/me";
export const ADMIN_LOGOUT_PATH = "/api/admin/auth/logout";
export const ADMIN_PASSWORD_PATH = "/api/admin/auth/password";
export const ADMIN_HANDOFF_REDEEM_PATH = "/api/admin/auth/handoff-redeem";
export const ADMIN_USERS_PATH = "/api/admin/users";
export const ADMIN_POSTS_PATH = "/api/admin/posts";
export const ADMIN_DASHBOARD_OVERVIEW_PATH = "/api/admin/dashboard/overview";
export const ADMIN_DASHBOARD_GROWTH_PATH = "/api/admin/dashboard/user-growth";
export const ADMIN_DASHBOARD_DISTRIBUTION_PATH = "/api/admin/dashboard/user-distribution";
export const ADMIN_DASHBOARD_SETTINGS_PATH = "/api/admin/dashboard/settings-distribution";
export const ADMIN_TRACK_OVERVIEW_PATH = "/api/admin/track/overview";
export const ADMIN_TRACK_DIMS_PATH = "/api/admin/track/dims";
export const ADMIN_TRACK_CRASHES_PATH = "/api/admin/track/crashes";
export const ADMIN_TRACK_LLM_PROXY_FAILS_PATH = "/api/admin/track/llm-proxy-fails";
export const ADMIN_TRACK_TREND_PATH = "/api/admin/track/trend";
export const ADMIN_TRACK_QUERY_PATH = "/api/admin/track/query";
export const ADMIN_LLM_KEYS_PATH = "/api/admin/llm/keys";
export const ADMIN_LLM_CHAT_PREFIX = "/api/admin/llm/v1";
export const ADMIN_HOME_GREETINGS_PATH = "/api/admin/home-greetings";
export const PLATFORM_LLM_MODEL = "glm-4.7-flash";

export const STUDENT_NO_PATTERN = /^\d{9}$/;
export const DEFAULT_USER_PAGE_SIZE = 20;
export const DEFAULT_POST_PAGE_SIZE = 20;
export const DEFAULT_LLM_KEY_PAGE_SIZE = 20;
export const DEFAULT_HOME_GREETING_PAGE_SIZE = 20;

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
  LLM_KEY_NOT_FOUND: 40420,
  LLM_USER_DAILY_LIMIT: 42910,
  LLM_USER_BUSY: 42911,
  TRACK_BAD_GATEWAY: 50201,
  LLM_UPSTREAM_FAILED: 50210,
  TRACK_UNAVAILABLE: 50301,
  LLM_POOL_UNAVAILABLE: 50310,
  LLM_POOL_BUSY: 50311,
  INTERNAL: 50000,
} as const;
