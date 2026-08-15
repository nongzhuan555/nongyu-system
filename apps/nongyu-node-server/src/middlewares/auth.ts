import type { NextFunction, Request, Response } from "express";
import { AppError, ErrorCodes } from "../lib/errors.js";
import { verifyAdminToken, verifyAppToken } from "../lib/jwt.js";
import { findUserById } from "../modules/users/repo.js";
import { asyncHandler } from "./common.js";

function extractBearer(req: Request): string {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, "未认证", 401);
  }
  return header.slice(7).trim();
}

export const requireAppAuth = asyncHandler(async (req, _res, next) => {
  const token = extractBearer(req);
  const claims = await verifyAppToken(token);
  const user = await findUserById(claims.uid);
  if (!user) {
    throw new AppError(ErrorCodes.TOKEN_REVOKED, "登录状态已失效，请重新登录", 401);
  }
  if (user.status !== 1) {
    throw new AppError(ErrorCodes.ACCOUNT_DISABLED, "账号已禁用", 403);
  }
  if (user.token_version !== claims.tokenVersion) {
    throw new AppError(ErrorCodes.TOKEN_REVOKED, "登录状态已失效，请重新登录", 401);
  }
  if (user.current_device_id && user.current_device_id !== claims.deviceId) {
    throw new AppError(ErrorCodes.TOKEN_REVOKED, "登录状态已失效，请重新登录", 401);
  }
  req.appAuth = claims;
  next();
});

async function attachAdminAuth(req: Request): Promise<void> {
  const token = extractBearer(req);
  const claims = await verifyAdminToken(token);

  if (claims.bootstrap) {
    req.adminAuth = claims;
    return;
  }

  const user = await findUserById(claims.uid);
  if (!user) {
    throw new AppError(ErrorCodes.TOKEN_REVOKED, "登录状态已失效，请重新登录", 401);
  }
  if (user.status !== 1) {
    throw new AppError(ErrorCodes.ACCOUNT_DISABLED, "账号已禁用", 403);
  }
  if (user.role !== 1) {
    throw new AppError(ErrorCodes.ADMIN_REQUIRED, "需要管理员权限", 403);
  }
  req.adminAuth = claims;
}

/** 允许 bootstrap 超管票（auth/me、logout、改密入口校验） */
export const requireAdminAuth = asyncHandler(async (req, _res, next) => {
  await attachAdminAuth(req);
  next();
});

/** 业务 Admin API：拒绝未建档超管票 */
export const requireProvisionedAdminAuth = asyncHandler(async (req, _res, next) => {
  await attachAdminAuth(req);
  if (req.adminAuth?.bootstrap) {
    throw new AppError(
      ErrorCodes.ADMIN_REQUIRED,
      "请先在 App 登录该学号完成建档后再使用管理功能",
      403,
    );
  }
  next();
});

export function optionalAppAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next();
    return;
  }
  requireAppAuth(req, _res, next);
}
