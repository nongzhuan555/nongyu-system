import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middlewares/common.js";
import { requireAppAuth } from "../../middlewares/auth.js";
import { ok } from "../../lib/response.js";
import { findSettingsByUserId, upsertSettings } from "./repo.js";
import { toUserSettingsDto } from "../users/mapper.js";

export const appSettingsRouter = Router();

const settingsPatchSchema = z.object({
  theme: z.enum(["sicau_green", "sakura_pink", "dark", "system"]).optional(),
  homeIsTimetable: z.boolean().optional(),
  openWebInApp: z.boolean().optional(),
  agentEnabled: z.boolean().optional(),
  highlightTodayColumn: z.boolean().optional(),
  courseCardColorMode: z.enum(["distinct", "unified"]).optional(),
  courseCardUnifiedColor: z.string().max(32).nullable().optional(),
  semesterStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  timetableBgUri: z.string().max(512).nullable().optional(),
});

appSettingsRouter.get(
  "/",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    let row = await findSettingsByUserId(req.appAuth!.uid);
    if (!row) {
      row = await upsertSettings(req.appAuth!.uid, {});
    }
    ok(res, toUserSettingsDto(row));
  }),
);

appSettingsRouter.put(
  "/",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const body = settingsPatchSchema.parse(req.body);
    const row = await upsertSettings(req.appAuth!.uid, body);
    ok(res, toUserSettingsDto(row));
  }),
);
