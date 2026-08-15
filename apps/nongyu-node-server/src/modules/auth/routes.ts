import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middlewares/common.js";
import { requireAdminAuth, requireAppAuth } from "../../middlewares/auth.js";
import { loginRateLimit } from "../../middlewares/rateLimit.js";
import { ok } from "../../lib/response.js";
import { findUserById } from "../users/repo.js";
import { toAppUserProfile } from "../users/mapper.js";
import { AppError, ErrorCodes } from "../../lib/errors.js";
import {
  adminLogin,
  adminLoginSchema,
  appLogin,
  appLoginSchema,
  appLogout,
  changeOwnAdminPassword,
} from "./service.js";

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
    if (!user) throw new AppError(ErrorCodes.TOKEN_REVOKED, "登录状态已失效，请重新登录", 401);
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
    const claims = req.adminAuth!;
    if (claims.bootstrap) {
      ok(res, {
        id: 0,
        studentNo: claims.studentNo,
        name: "超级管理员",
        role: 1 as const,
        bootstrap: true as const,
      });
      return;
    }
    const user = await findUserById(claims.uid);
    if (!user) throw new AppError(ErrorCodes.TOKEN_REVOKED, "登录状态已失效，请重新登录", 401);
    ok(res, {
      id: Number(user.id),
      studentNo: user.student_no,
      name: user.name,
      role: 1 as const,
    });
  }),
);

adminAuthRouter.put(
  "/password",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const body = z.object({ adminPassword: z.string().min(1) }).parse(req.body);
    await changeOwnAdminPassword(req.adminAuth!.uid, body.adminPassword);
    ok(res, null);
  }),
);
