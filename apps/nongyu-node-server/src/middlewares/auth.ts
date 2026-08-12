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
    throw new AppError(ErrorCodes.TOKEN_INVALID, "Token 无效或已失效", 401);
  }
  if (user.status !== 1) {
    throw new AppError(ErrorCodes.ACCOUNT_DISABLED, "账号已禁用", 403);
  }
  if (user.token_version !== claims.tokenVersion) {
    throw new AppError(ErrorCodes.TOKEN_INVALID, "Token 无效或已失效", 401);
  }
  if (user.current_device_id && user.current_device_id !== claims.deviceId) {
    throw new AppError(ErrorCodes.TOKEN_INVALID, "Token 无效或已失效", 401);
  }
  req.appAuth = claims;
  next();
});

export const requireAdminAuth = asyncHandler(async (req, _res, next) => {
  const token = extractBearer(req);
  const claims = await verifyAdminToken(token);
  const user = await findUserById(claims.uid);
  if (!user) {
    throw new AppError(ErrorCodes.TOKEN_INVALID, "Token 无效或已失效", 401);
  }
  if (user.status !== 1) {
    throw new AppError(ErrorCodes.ACCOUNT_DISABLED, "账号已禁用", 403);
  }
  if (user.role !== 1) {
    throw new AppError(ErrorCodes.ADMIN_REQUIRED, "需要管理员权限", 403);
  }
  req.adminAuth = claims;
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
