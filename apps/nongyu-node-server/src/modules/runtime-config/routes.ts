import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middlewares/common.js";
import { requireAppAuth, requireProvisionedAdminAuth } from "../../middlewares/auth.js";
import { ok } from "../../lib/response.js";
import { AppError, ErrorCodes } from "../../lib/errors.js";
import { isSuperAdminRole } from "../../lib/roles.js";
import { findUserById } from "../users/repo.js";
import { getTrackSampleRate, setTrackSampleRate } from "./repo.js";

export const adminTrackSampleRateRouter = Router();
export const appTrackSampleRateRouter = Router();

async function requireSuperAdmin(operatorUid: number): Promise<void> {
  const operator = await findUserById(operatorUid);
  if (!operator || !isSuperAdminRole(operator.role)) {
    throw new AppError(ErrorCodes.ADMIN_REQUIRED, "仅超级管理员可配置埋点采样率", 403);
  }
}

adminTrackSampleRateRouter.get(
  "/",
  requireProvisionedAdminAuth,
  asyncHandler(async (req, res) => {
    await requireSuperAdmin(req.adminAuth!.uid);
    const sampleRate = await getTrackSampleRate();
    ok(res, { sampleRate });
  }),
);

adminTrackSampleRateRouter.put(
  "/",
  requireProvisionedAdminAuth,
  asyncHandler(async (req, res) => {
    await requireSuperAdmin(req.adminAuth!.uid);
    const body = z
      .object({
        sampleRate: z
          .number({ invalid_type_error: "sampleRate 须为整数" })
          .int("sampleRate 须为整数")
          .min(0, "sampleRate 须在 0–100")
          .max(100, "sampleRate 须在 0–100"),
      })
      .parse(req.body);
    const sampleRate = await setTrackSampleRate(body.sampleRate, req.adminAuth!.uid);
    ok(res, { sampleRate });
  }),
);

appTrackSampleRateRouter.get(
  "/",
  requireAppAuth,
  asyncHandler(async (_req, res) => {
    const sampleRate = await getTrackSampleRate();
    ok(res, { sampleRate });
  }),
);
