import axios, { type AxiosError } from "axios";
import type { AdminLoginResult, AdminUser, LoginType } from "../types/auth";
import type {
  DashboardOverview,
  GrowthRange,
  SettingsDistribution,
  TrackCrashPage,
  TrackDims,
  TrackOverview,
  UserDistribution,
  UserGrowth,
} from "../types/dashboard";
import type {
  AdminPostItem,
  AdminPostListQuery,
  AdminPostPage,
  CreateAnnouncementBody,
  PatchAnnouncementBody,
} from "../types/posts";
import type {
  AdminUserDetail,
  AdminUserListItem,
  AdminUserListQuery,
  PageResult,
  PatchAdminUserBody,
} from "../types/users";
import type {
  AdminLlmKeyItem,
  AdminLlmKeyListQuery,
  CreateLlmKeyBody,
  PatchLlmKeyBody,
} from "../types/llmKeys";
import {
  ADMIN_LOGIN_PATH,
  ADMIN_LOGOUT_PATH,
  ADMIN_ME_PATH,
  ADMIN_PASSWORD_PATH,
  ADMIN_POSTS_PATH,
  ADMIN_USERS_PATH,
  ADMIN_DASHBOARD_OVERVIEW_PATH,
  ADMIN_DASHBOARD_GROWTH_PATH,
  ADMIN_DASHBOARD_DISTRIBUTION_PATH,
  ADMIN_DASHBOARD_SETTINGS_PATH,
  ADMIN_TRACK_OVERVIEW_PATH,
  ADMIN_TRACK_DIMS_PATH,
  ADMIN_TRACK_CRASHES_PATH,
  ADMIN_TRACK_LLM_PROXY_FAILS_PATH,
  ADMIN_LLM_KEYS_PATH,
  AUTH_ERROR_CODES,
} from "./constants";
import { readSession } from "./storage";
import { notifyUnauthorized } from "./unauthorizedHandler";

export type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T | null;
};

export class AdminApiError extends Error {
  readonly code: number;
  readonly httpStatus: number;
  readonly serverMessage: string;

  constructor(code: number, serverMessage: string, httpStatus: number) {
    super(serverMessage);
    this.name = "AdminApiError";
    this.code = code;
    this.serverMessage = serverMessage;
    this.httpStatus = httpStatus;
  }
}

function resolveBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (!raw) return "";
  return raw.replace(/\/$/, "");
}

function isEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.code === "number" && typeof record.message === "string";
}

function toAdminApiError(body: unknown, httpStatus: number): AdminApiError {
  if (isEnvelope(body)) {
    return new AdminApiError(body.code, body.message, httpStatus);
  }
  return new AdminApiError(AUTH_ERROR_CODES.INTERNAL, "服务异常，请稍后重试", httpStatus);
}

function isLoginRequest(url: string | undefined): boolean {
  return typeof url === "string" && url.includes(ADMIN_LOGIN_PATH);
}

function isUnauthorizedCode(code: number): boolean {
  return (
    code === AUTH_ERROR_CODES.UNAUTHORIZED ||
    code === AUTH_ERROR_CODES.TOKEN_INVALID ||
    code === AUTH_ERROR_CODES.TOKEN_EXPIRED ||
    code === AUTH_ERROR_CODES.TOKEN_REVOKED
  );
}

export const adminApi = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

adminApi.interceptors.request.use((config) => {
  const session = readSession();
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  return config;
});

adminApi.interceptors.response.use(
  (response) => {
    const body: unknown = response.data;
    if (isEnvelope(body) && body.code !== 0) {
      return Promise.reject(toAdminApiError(body, response.status));
    }
    return response;
  },
  (error: AxiosError<unknown>) => {
    if (!error.response) {
      return Promise.reject(error);
    }
    const apiError = toAdminApiError(error.response.data, error.response.status);
    const requestUrl = error.config?.url;
    if (isUnauthorizedCode(apiError.code) && !isLoginRequest(requestUrl)) {
      notifyUnauthorized();
    }
    return Promise.reject(apiError);
  },
);

function unwrapData<T>(payload: unknown): T {
  if (!isEnvelope(payload) || payload.data === null) {
    throw new AdminApiError(AUTH_ERROR_CODES.INTERNAL, "服务异常，请稍后重试", 500);
  }
  return payload.data as T;
}

export async function loginAdmin(body: {
  studentNo: string;
  adminPassword: string;
  loginType: LoginType;
}): Promise<AdminLoginResult> {
  const response = await adminApi.post<ApiEnvelope<AdminLoginResult>>(ADMIN_LOGIN_PATH, body);
  return unwrapData<AdminLoginResult>(response.data);
}

export async function fetchAdminMe(): Promise<AdminUser> {
  const response = await adminApi.get<ApiEnvelope<AdminUser>>(ADMIN_ME_PATH);
  return unwrapData<AdminUser>(response.data);
}

export async function logoutAdmin(): Promise<void> {
  await adminApi.post<ApiEnvelope<null>>(ADMIN_LOGOUT_PATH);
}

export async function changeOwnAdminPassword(adminPassword: string): Promise<void> {
  await adminApi.put<ApiEnvelope<null>>(ADMIN_PASSWORD_PATH, { adminPassword });
}

export async function listAdminUsers(
  query: AdminUserListQuery,
): Promise<PageResult<AdminUserListItem>> {
  const response = await adminApi.get<ApiEnvelope<PageResult<AdminUserListItem>>>(
    ADMIN_USERS_PATH,
    {
      params: query,
    },
  );
  return unwrapData(response.data);
}

export async function fetchAdminUser(id: number): Promise<AdminUserDetail> {
  const response = await adminApi.get<ApiEnvelope<AdminUserDetail>>(`${ADMIN_USERS_PATH}/${id}`);
  return unwrapData(response.data);
}

export async function patchAdminUser(
  id: number,
  body: PatchAdminUserBody,
): Promise<{ id: number; studentNo: string; name: string; role: 0 | 1; status: 0 | 1 }> {
  const response = await adminApi.patch<
    ApiEnvelope<{ id: number; studentNo: string; name: string; role: 0 | 1; status: 0 | 1 }>
  >(`${ADMIN_USERS_PATH}/${id}`, body);
  return unwrapData(response.data);
}

export async function setAdminUserPassword(id: number, adminPassword: string): Promise<void> {
  await adminApi.put<ApiEnvelope<null>>(`${ADMIN_USERS_PATH}/${id}/admin-password`, {
    adminPassword,
  });
}

export async function listAdminPosts(query: AdminPostListQuery): Promise<AdminPostPage> {
  const response = await adminApi.get<ApiEnvelope<AdminPostPage>>(ADMIN_POSTS_PATH, {
    params: query,
  });
  return unwrapData(response.data);
}

export async function fetchAdminPost(id: number): Promise<AdminPostItem> {
  const response = await adminApi.get<ApiEnvelope<AdminPostItem>>(`${ADMIN_POSTS_PATH}/${id}`);
  return unwrapData(response.data);
}

export async function createAdminAnnouncement(
  body: CreateAnnouncementBody,
): Promise<{ id: number }> {
  const response = await adminApi.post<ApiEnvelope<{ id: number }>>(ADMIN_POSTS_PATH, body);
  return unwrapData(response.data);
}

export async function patchAdminAnnouncement(
  id: number,
  body: PatchAnnouncementBody,
): Promise<{ id: number }> {
  const response = await adminApi.patch<ApiEnvelope<{ id: number }>>(
    `${ADMIN_POSTS_PATH}/${id}`,
    body,
  );
  return unwrapData(response.data);
}

export async function deleteAdminPost(id: number): Promise<void> {
  await adminApi.delete<ApiEnvelope<null>>(`${ADMIN_POSTS_PATH}/${id}`);
}

export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  const response = await adminApi.get<ApiEnvelope<DashboardOverview>>(
    ADMIN_DASHBOARD_OVERVIEW_PATH,
  );
  return unwrapData(response.data);
}

export async function fetchUserGrowth(range: GrowthRange): Promise<UserGrowth> {
  const response = await adminApi.get<ApiEnvelope<UserGrowth>>(ADMIN_DASHBOARD_GROWTH_PATH, {
    params: { range },
  });
  return unwrapData(response.data);
}

export async function fetchUserDistribution(): Promise<UserDistribution> {
  const response = await adminApi.get<ApiEnvelope<UserDistribution>>(
    ADMIN_DASHBOARD_DISTRIBUTION_PATH,
  );
  return unwrapData(response.data);
}

export async function fetchSettingsDistribution(): Promise<SettingsDistribution> {
  const response = await adminApi.get<ApiEnvelope<SettingsDistribution>>(
    ADMIN_DASHBOARD_SETTINGS_PATH,
  );
  return unwrapData(response.data);
}

export async function fetchTrackOverview(): Promise<TrackOverview> {
  const response = await adminApi.get<ApiEnvelope<TrackOverview>>(ADMIN_TRACK_OVERVIEW_PATH);
  return unwrapData(response.data);
}

export async function fetchTrackDims(
  metric: "screen_views" | "perf_p50" | "perf_p95",
): Promise<TrackDims> {
  const response = await adminApi.get<ApiEnvelope<TrackDims>>(ADMIN_TRACK_DIMS_PATH, {
    params: { metric, limit: 20 },
  });
  return unwrapData(response.data);
}

export async function fetchTrackCrashes(page: number, pageSize = 10): Promise<TrackCrashPage> {
  const response = await adminApi.get<ApiEnvelope<TrackCrashPage>>(ADMIN_TRACK_CRASHES_PATH, {
    params: { page, pageSize },
  });
  return unwrapData(response.data);
}

export async function fetchTrackLlmProxyFails(params: {
  from: string;
  to: string;
  page: number;
  pageSize: number;
  errorCode?: string;
}): Promise<TrackCrashPage> {
  const response = await adminApi.get<ApiEnvelope<TrackCrashPage>>(
    ADMIN_TRACK_LLM_PROXY_FAILS_PATH,
    { params },
  );
  return unwrapData(response.data);
}

export async function listAdminLlmKeys(
  query: AdminLlmKeyListQuery,
): Promise<PageResult<AdminLlmKeyItem>> {
  const response = await adminApi.get<ApiEnvelope<PageResult<AdminLlmKeyItem>>>(
    ADMIN_LLM_KEYS_PATH,
    { params: query },
  );
  return unwrapData(response.data);
}

export async function createAdminLlmKey(body: CreateLlmKeyBody): Promise<AdminLlmKeyItem> {
  const response = await adminApi.post<ApiEnvelope<AdminLlmKeyItem>>(ADMIN_LLM_KEYS_PATH, body);
  return unwrapData(response.data);
}

export async function patchAdminLlmKey(
  id: number,
  body: PatchLlmKeyBody,
): Promise<AdminLlmKeyItem> {
  const response = await adminApi.patch<ApiEnvelope<AdminLlmKeyItem>>(
    `${ADMIN_LLM_KEYS_PATH}/${id}`,
    body,
  );
  return unwrapData(response.data);
}

export async function deleteAdminLlmKey(id: number): Promise<void> {
  await adminApi.delete<ApiEnvelope<null>>(`${ADMIN_LLM_KEYS_PATH}/${id}`);
}
