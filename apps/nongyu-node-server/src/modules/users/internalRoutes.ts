import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middlewares/common.js";
import { requireInternalToken } from "../../middlewares/internalAuth.js";
import { ok } from "../../lib/response.js";
import { AppError, ErrorCodes } from "../../lib/errors.js";
import { updateUserPresence } from "./repo.js";

export const internalUsersRouter = Router();

internalUsersRouter.post(
  "/presence",
  requireInternalToken,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        user_id: z.coerce.number().int().positive(),
        is_online: z.union([z.literal(0), z.literal(1)]),
        last_active_at_ms: z.coerce.number().int().nonnegative(),
      })
      .parse(req.body);
    const lastActiveAt = new Date(body.last_active_at_ms);
    if (Number.isNaN(lastActiveAt.getTime())) {
      throw new AppError(ErrorCodes.VALIDATION, "last_active_at_ms 无效", 400);
    }
    const updated = await updateUserPresence(body.user_id, body.is_online, lastActiveAt);
    if (!updated) {
      throw new AppError(ErrorCodes.USER_NOT_FOUND, "用户不存在", 404);
    }
    ok(res, {
      userId: body.user_id,
      isOnline: body.is_online === 1,
    });
  }),
);
