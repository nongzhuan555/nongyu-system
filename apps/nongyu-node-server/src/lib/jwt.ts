import { SignJWT, jwtVerify, errors as JoseErrors, type JWTPayload } from "jose";
import { getEnv } from "../config/env.js";
import { AppError, ErrorCodes } from "./errors.js";
import { isAdminRole } from "./roles.js";

export type AppTokenClaims = {
  uid: number;
  studentNo: string;
  tokenVersion: number;
  typ: "app";
  deviceId: string;
};

export type AdminTokenClaims = {
  uid: number;
  studentNo: string;
  role: 1 | 2;
  typ: "admin";
  bootstrap?: boolean;
};

function secretKey() {
  return new TextEncoder().encode(getEnv().JWT_SECRET);
}

function parseDurationToSeconds(ttl: string): number {
  const m = /^(\d+)([smhd])$/.exec(ttl.trim());
  if (!m) throw new Error(`Invalid TTL: ${ttl}`);
  const n = Number(m[1]);
  const unit = m[2];
  const mult = unit === "s" ? 1 : unit === "m" ? 60 : unit === "h" ? 3600 : 86400;
  return n * mult;
}

export function getSuperAdminStudentNo(): string {
  return getEnv().SUPER_ADMIN_STUDENT_NO;
}

export function isSuperAdminStudentNo(studentNo: string): boolean {
  return studentNo === getSuperAdminStudentNo();
}

export async function signAppToken(claims: Omit<AppTokenClaims, "typ">): Promise<string> {
  const env = getEnv();
  return new SignJWT({
    uid: claims.uid,
    studentNo: claims.studentNo,
    tokenVersion: claims.tokenVersion,
    typ: "app",
    deviceId: claims.deviceId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${parseDurationToSeconds(env.JWT_APP_TTL)}s`)
    .sign(secretKey());
}

export async function signAdminToken(
  claims: Omit<AdminTokenClaims, "typ"> & { bootstrap?: boolean },
): Promise<string> {
  const payload: Record<string, unknown> = {
    uid: claims.uid,
    studentNo: claims.studentNo,
    role: claims.role,
    typ: "admin",
  };
  if (claims.bootstrap) {
    payload.bootstrap = true;
  }
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().sign(secretKey());
}

async function verifyRaw(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload;
  } catch (err) {
    if (err instanceof JoseErrors.JWTExpired) {
      throw new AppError(ErrorCodes.TOKEN_EXPIRED, "登录已过期，请重新登录", 401);
    }
    throw new AppError(ErrorCodes.TOKEN_INVALID, "Token 无效或已失效", 401);
  }
}

export async function verifyAppToken(token: string): Promise<AppTokenClaims> {
  const payload = await verifyRaw(token);
  if (payload.typ !== "app") {
    throw new AppError(ErrorCodes.TOKEN_INVALID, "Token 类型错误", 401);
  }
  const uid = Number(payload.uid);
  const tokenVersion = Number(payload.tokenVersion);
  const studentNo = String(payload.studentNo ?? "");
  const deviceId = String(payload.deviceId ?? "");
  if (!uid || !studentNo || !deviceId || Number.isNaN(tokenVersion)) {
    throw new AppError(ErrorCodes.TOKEN_INVALID, "Token 载荷不完整", 401);
  }
  return { uid, studentNo, tokenVersion, typ: "app", deviceId };
}

export async function verifyAdminToken(token: string): Promise<AdminTokenClaims> {
  const payload = await verifyRaw(token);
  const roleNum = Number(payload.role);
  if (payload.typ !== "admin" || !isAdminRole(roleNum)) {
    throw new AppError(ErrorCodes.TOKEN_INVALID, "Token 类型错误", 401);
  }
  const role = roleNum as 1 | 2;
  const studentNo = String(payload.studentNo ?? "");
  const bootstrap = payload.bootstrap === true;
  const uid = Number(payload.uid);

  if (bootstrap) {
    if (!isSuperAdminStudentNo(studentNo) || uid !== 0) {
      throw new AppError(ErrorCodes.TOKEN_INVALID, "Token 载荷不完整", 401);
    }
    return { uid: 0, studentNo, role: 2, typ: "admin", bootstrap: true };
  }

  if (!uid || !studentNo) {
    throw new AppError(ErrorCodes.TOKEN_INVALID, "Token 载荷不完整", 401);
  }
  return { uid, studentNo, role, typ: "admin" };
}
