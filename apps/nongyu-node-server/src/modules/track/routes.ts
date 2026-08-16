import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middlewares/common.js";
import { requireProvisionedAdminAuth } from "../../middlewares/auth.js";
import { ok } from "../../lib/response.js";
import { AppError, ErrorCodes } from "../../lib/errors.js";
import { pageParams } from "../../lib/util.js";
import {
  getTrackCrashes,
  getTrackDims,
  getTrackLlmProxyFails,
  getTrackOverview,
  getTrackTrend,
  todayBusinessDate,
} from "./service.js";

export const adminTrackRouter = Router();

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期须为 YYYY-MM-DD");
const dimMetricSchema = z.enum(["screen_views", "button_clicks", "perf_p50", "perf_p95"]);
const trendMetricSchema = z.enum([
  "dau",
  "crash_count",
  "app_open_count",
  "screen_view_count",
  "online_peak",
]);

adminTrackRouter.get(
  "/overview",
  requireProvisionedAdminAuth,
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        date: dateSchema.optional(),
      })
      .parse(req.query);
    const date = query.date ?? todayBusinessDate();
    ok(res, await getTrackOverview(date));
  }),
);

adminTrackRouter.get(
  "/dims",
  requireProvisionedAdminAuth,
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        metric: dimMetricSchema,
        date: dateSchema.optional(),
        limit: z.coerce.number().int().min(1).max(100).optional(),
      })
      .parse(req.query);
    const date = query.date ?? todayBusinessDate();
    const limit = query.limit ?? 50;
    ok(res, await getTrackDims(query.metric, date, limit));
  }),
);

adminTrackRouter.get(
  "/crashes",
  requireProvisionedAdminAuth,
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        from: dateSchema.optional(),
        to: dateSchema.optional(),
        page: z.coerce.number().optional(),
        pageSize: z.coerce.number().optional(),
      })
      .parse(req.query);
    const today = todayBusinessDate();
    const from = query.from ?? today;
    const to = query.to ?? today;
    if (from > to) {
      throw new AppError(ErrorCodes.VALIDATION, "from 不能晚于 to", 400);
    }
    const { page, pageSize } = pageParams(query.page, query.pageSize);
    ok(res, await getTrackCrashes(from, to, page, pageSize));
  }),
);

adminTrackRouter.get(
  "/llm-proxy-fails",
  requireProvisionedAdminAuth,
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        from: dateSchema.optional(),
        to: dateSchema.optional(),
        page: z.coerce.number().optional(),
        pageSize: z.coerce.number().optional(),
        errorCode: z
          .string()
          .regex(/^(50210|50310|50311|42910|42911)$/, "errorCode 无效")
          .optional(),
      })
      .parse(req.query);
    const today = todayBusinessDate();
    const from = query.from ?? today;
    const to = query.to ?? today;
    if (from > to) {
      throw new AppError(ErrorCodes.VALIDATION, "from 不能晚于 to", 400);
    }
    const { page, pageSize } = pageParams(query.page, query.pageSize);
    ok(res, await getTrackLlmProxyFails(from, to, page, pageSize, query.errorCode));
  }),
);

adminTrackRouter.get(
  "/trend",
  requireProvisionedAdminAuth,
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        metric: trendMetricSchema,
        from: dateSchema,
        to: dateSchema,
      })
      .parse(req.query);
    if (query.from > query.to) {
      throw new AppError(ErrorCodes.VALIDATION, "from 不能晚于 to", 400);
    }
    ok(res, await getTrackTrend(query.metric, query.from, query.to));
  }),
);
