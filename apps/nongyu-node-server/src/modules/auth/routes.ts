import { Router } from "express";
import { asyncHandler } from "../../middlewares/common.js";
import { requireAdminAuth, requireAppAuth } from "../../middlewares/auth.js";
import { loginRateLimit } from "../../middlewares/rateLimit.js";
import { ok } from "../../lib/response.js";
import { findUserById } from "../users/repo.js";
import { toAppUserProfile } from "../users/mapper.js";
import { AppError, ErrorCodes } from "../../lib/errors.js";
import { adminLogin, adminLoginSchema, appLogin, appLoginSchema, appLogout } from "./service.js";

export const appAuthRouter = Router();
export const adminAuthRouter = Router();

appAuthRouter.post(
  "/login",
  loginRateLimit,
  asyncHandler(async (req, res) => {
    const body = appLoginSchema.parse(req.body);
    const data = await appLogin(body);
    ok(res, data);
  }),
);

appAuthRouter.post(
  "/logout",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    await appLogout(req.appAuth!.uid);
    ok(res, null);
  }),
);

appAuthRouter.get(
  "/me",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const user = await findUserById(req.appAuth!.uid);
    if (!user) throw new AppError(ErrorCodes.TOKEN_INVALID, "Token 无效或已失效", 401);
    ok(res, toAppUserProfile(user));
  }),
);

adminAuthRouter.post(
  "/login",
  loginRateLimit,
  asyncHandler(async (req, res) => {
    const body = adminLoginSchema.parse(req.body);
    const data = await adminLogin(body);
    ok(res, data);
  }),
);

adminAuthRouter.post(
  "/logout",
  requireAdminAuth,
  asyncHandler(async (_req, res) => {
    ok(res, null);
  }),
);

adminAuthRouter.get(
  "/me",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const user = await findUserById(req.adminAuth!.uid);
    if (!user) throw new AppError(ErrorCodes.TOKEN_INVALID, "Token 无效或已失效", 401);
    ok(res, {
      id: Number(user.id),
      studentNo: user.student_no,
      name: user.name,
      role: 1 as const,
    });
  }),
);
