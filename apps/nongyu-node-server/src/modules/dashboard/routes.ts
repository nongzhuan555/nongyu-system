import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middlewares/common.js";
import { requireProvisionedAdminAuth } from "../../middlewares/auth.js";
import { ok } from "../../lib/response.js";
import {
  getOverview,
  getSettingsDistribution,
  getUserDistribution,
  getUserGrowth,
  getActiveDaysRanking,
} from "./service.js";

export const adminDashboardRouter = Router();

adminDashboardRouter.get(
  "/overview",
  requireProvisionedAdminAuth,
  asyncHandler(async (_req, res) => {
    ok(res, await getOverview());
  }),
);

adminDashboardRouter.get(
  "/user-growth",
  requireProvisionedAdminAuth,
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        range: z.enum(["7d", "30d", "90d", "180d", "365d"]).default("7d"),
      })
      .parse(req.query);
    ok(res, await getUserGrowth(query.range));
  }),
);

adminDashboardRouter.get(
  "/user-distribution",
  requireProvisionedAdminAuth,
  asyncHandler(async (_req, res) => {
    ok(res, await getUserDistribution());
  }),
);

adminDashboardRouter.get(
  "/active-days-ranking",
  requireProvisionedAdminAuth,
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        limit: z
          .enum(["50", "100", "200"])
          .optional()
          .transform((v) => (v === undefined ? (50 as const) : (Number(v) as 50 | 100 | 200))),
        order: z.enum(["asc", "desc"]).default("desc"),
      })
      .parse(req.query);
    ok(res, await getActiveDaysRanking(query.limit, query.order));
  }),
);

adminDashboardRouter.get(
  "/settings-distribution",
  requireProvisionedAdminAuth,
  asyncHandler(async (_req, res) => {
    ok(res, await getSettingsDistribution());
  }),
);
