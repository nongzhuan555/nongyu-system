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
  TRACK_BAD_GATEWAY: 50201,
  TRACK_UNAVAILABLE: 50301,
  INTERNAL: 50000,
} as const;

export class AppError extends Error {
  readonly code: number;
  readonly httpStatus: number;

  constructor(code: number, message: string, httpStatus = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
