/**
 * App API 统一错误（带业务码，供鉴权失效分流）
 */
export class AppApiError extends Error {
  readonly code: number;
  readonly httpStatus: number;

  constructor(code: number, message: string, httpStatus: number) {
    super(message);
    this.name = "AppApiError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export const APP_AUTH_ERROR_CODES = {
  UNAUTHORIZED: 40101,
  TOKEN_INVALID: 40102,
  TOKEN_EXPIRED: 40103,
  TOKEN_REVOKED: 40104,
} as const;

export function isAuthInvalidCode(code: number): boolean {
  return (
    code === APP_AUTH_ERROR_CODES.TOKEN_INVALID ||
    code === APP_AUTH_ERROR_CODES.TOKEN_EXPIRED ||
    code === APP_AUTH_ERROR_CODES.TOKEN_REVOKED ||
    code === APP_AUTH_ERROR_CODES.UNAUTHORIZED
  );
}
