export const ErrorCodes = {
  OK: 0,
  VALIDATION: 40001,
  UNAUTHORIZED: 40101,
  TOKEN_INVALID: 40102,
  TOKEN_EXPIRED: 40103,
  TOKEN_REVOKED: 40104,
  ACCOUNT_DISABLED: 40301,
  ADMIN_REQUIRED: 40302,
  ADMIN_PASSWORD_WRONG: 40303,
  USER_NOT_FOUND: 40401,
  POST_NOT_FOUND: 40402,
  VERSION_NOT_FOUND: 40403,
  COURSE_SHARE_NOT_FOUND: 40410,
  LLM_KEY_NOT_FOUND: 40420,
  HOME_GREETING_NOT_FOUND: 40430,
  LLM_USER_DAILY_LIMIT: 42910,
  LLM_USER_BUSY: 42911,
  TRACK_BAD_GATEWAY: 50201,
  LLM_UPSTREAM_FAILED: 50210,
  TRACK_UNAVAILABLE: 50301,
  LLM_POOL_UNAVAILABLE: 50310,
  LLM_POOL_BUSY: 50311,
  INTERNAL: 50000,
} as const;

export class AppError extends Error {
  readonly code: number;
  readonly httpStatus: number;
  readonly data: unknown | null;

  constructor(code: number, message: string, httpStatus = 400, data: unknown | null = null) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.data = data;
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
