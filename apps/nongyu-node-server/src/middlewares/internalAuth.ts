import type { NextFunction, Request, Response } from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import { AppError, ErrorCodes } from "../lib/errors.js";
import { getEnv } from "../config/env.js";
import { asyncHandler } from "./common.js";

function equalToken(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** Track 等内部服务调用；禁止当作公网用户鉴权。 */
export const requireInternalToken = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const got = req.header("x-internal-token") ?? "";
    const expected = getEnv().INTERNAL_TOKEN;
    if (!got || !equalToken(got, expected)) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, "内部令牌无效", 401);
    }
    next();
  },
);
