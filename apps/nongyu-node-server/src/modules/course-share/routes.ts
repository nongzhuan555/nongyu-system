import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middlewares/common.js";
import { requireAppAuth } from "../../middlewares/auth.js";
import { courseShareLookupRateLimit } from "../../middlewares/rateLimit.js";
import { AppError, ErrorCodes } from "../../lib/errors.js";
import { ok } from "../../lib/response.js";
import { studentNoSchema } from "../../lib/util.js";
import { findUserById } from "../users/repo.js";
import {
  findShareByStudentNo,
  findShareByUserId,
  upsertShareDisabled,
  upsertShareEnabled,
} from "./repo.js";
import { toPeerDtoIfShareable, toShareStatusDto } from "./mapper.js";

export const appCourseShareRouter = Router();

const courseEntrySchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(256),
  teacher: z.string().max(128).default(""),
  room: z.string().max(128).default(""),
  day: z.number().int().min(1).max(7),
  startPeriod: z.number().int().min(1).max(10),
  endPeriod: z.number().int().min(1).max(10),
  weeks: z.object({
    start: z.number().int().min(1),
    end: z.number().int().min(1),
  }),
  weeksList: z.array(z.number().int().min(1)).optional(),
  odd: z.boolean(),
  even: z.boolean(),
});

const putBodySchema = z.discriminatedUnion("enabled", [
  z.object({
    enabled: z.literal(true),
    courses: z.array(courseEntrySchema).min(1).max(120),
  }),
  z.object({
    enabled: z.literal(false),
  }),
]);

const NOT_FOUND_MSG = "未找到可查看的课表";

appCourseShareRouter.get(
  "/me",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const row = await findShareByUserId(req.appAuth!.uid);
    ok(res, toShareStatusDto(row));
  }),
);

appCourseShareRouter.put(
  "/me",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const body = putBodySchema.parse(req.body);
    const user = await findUserById(req.appAuth!.uid);
    if (!user) {
      throw new AppError(ErrorCodes.TOKEN_REVOKED, "登录状态已失效，请重新登录", 401);
    }

    if (body.enabled) {
      const json = JSON.stringify(body.courses);
      const row = await upsertShareEnabled(user.id, user.student_no, json);
      ok(res, toShareStatusDto(row));
      return;
    }

    const row = await upsertShareDisabled(user.id, user.student_no);
    ok(res, toShareStatusDto(row));
  }),
);

appCourseShareRouter.get(
  "/by-student/:studentNo",
  requireAppAuth,
  courseShareLookupRateLimit,
  asyncHandler(async (req, res) => {
    const studentNo = studentNoSchema.parse(req.params.studentNo);
    const row = await findShareByStudentNo(studentNo);
    const dto = toPeerDtoIfShareable(row);
    if (!dto) {
      // 统一文案；真实原因仅服务端日志
      console.info("[course-share] lookup miss", {
        studentNo,
        reason: !row ? "no_row" : !row.share_enabled ? "disabled" : "empty_json",
        viewerUid: req.appAuth!.uid,
      });
      throw new AppError(ErrorCodes.COURSE_SHARE_NOT_FOUND, NOT_FOUND_MSG, 404);
    }
    ok(res, dto);
  }),
);
