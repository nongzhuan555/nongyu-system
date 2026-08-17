import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middlewares/common.js";
import { requireAppAuth, requireProvisionedAdminAuth } from "../../middlewares/auth.js";
import { ok } from "../../lib/response.js";
import { AppError, ErrorCodes } from "../../lib/errors.js";
import { boolFromDb, pageParams } from "../../lib/util.js";
import { toIsoUtcRequired } from "../../lib/time.js";
import {
  deleteGreeting,
  findEnabledGreeting,
  findGreetingById,
  insertGreeting,
  listGreetings,
  updateGreeting,
} from "./repo.js";

export const appHomeGreetingRouter = Router();
export const adminHomeGreetingsRouter = Router();

const messageSchema = z.string().trim().min(1, "问候语不能为空").max(48, "问候语最多 48 字");

function toAdminDto(row: NonNullable<Awaited<ReturnType<typeof findGreetingById>>>) {
  return {
    id: Number(row.id),
    message: row.message,
    enabled: boolFromDb(row.enabled),
    createdAt: toIsoUtcRequired(row.created_at),
    updatedAt: toIsoUtcRequired(row.updated_at),
  };
}

appHomeGreetingRouter.get(
  "/",
  requireAppAuth,
  asyncHandler(async (_req, res) => {
    const row = await findEnabledGreeting();
    if (!row) {
      ok(res, null);
      return;
    }
    ok(res, {
      id: Number(row.id),
      message: row.message,
    });
  }),
);

adminHomeGreetingsRouter.get(
  "/",
  requireProvisionedAdminAuth,
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        enabled: z
          .union([z.literal("0"), z.literal("1"), z.literal(0), z.literal(1)])
          .optional()
          .transform((v) => (v === undefined ? undefined : v === 1 || v === "1")),
        page: z.coerce.number().optional(),
        pageSize: z.coerce.number().optional(),
      })
      .parse(req.query);
    const { page, pageSize, offset } = pageParams(query.page, query.pageSize);
    const { rows, total } = await listGreetings({
      enabled: query.enabled,
      offset,
      pageSize,
    });
    ok(res, {
      list: rows.map(toAdminDto),
      total,
      page,
      pageSize,
    });
  }),
);

adminHomeGreetingsRouter.post(
  "/",
  requireProvisionedAdminAuth,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        message: messageSchema,
        enabled: z.boolean().optional().default(false),
      })
      .parse(req.body);
    const id = await insertGreeting({
      message: body.message,
      enabled: body.enabled,
    });
    ok(res, { id });
  }),
);

adminHomeGreetingsRouter.patch(
  "/:id",
  requireProvisionedAdminAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      throw new AppError(ErrorCodes.VALIDATION, "id 无效", 400);
    }
    const existing = await findGreetingById(id);
    if (!existing) {
      throw new AppError(ErrorCodes.HOME_GREETING_NOT_FOUND, "问候语不存在", 404);
    }
    const body = z
      .object({
        message: messageSchema.optional(),
        enabled: z.boolean().optional(),
      })
      .refine((v) => v.message !== undefined || v.enabled !== undefined, {
        message: "至少提供 message 或 enabled",
      })
      .parse(req.body);
    await updateGreeting(id, {
      message: body.message,
      enabled: body.enabled,
    });
    ok(res, { id });
  }),
);

adminHomeGreetingsRouter.delete(
  "/:id",
  requireProvisionedAdminAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      throw new AppError(ErrorCodes.VALIDATION, "id 无效", 400);
    }
    const existing = await findGreetingById(id);
    if (!existing) {
      throw new AppError(ErrorCodes.HOME_GREETING_NOT_FOUND, "问候语不存在", 404);
    }
    await deleteGreeting(id);
    ok(res, null);
  }),
);
