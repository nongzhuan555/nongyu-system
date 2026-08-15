import rateLimit from "express-rate-limit";
import type { Request } from "express";

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 40001, message: "登录尝试过于频繁，请稍后再试", data: null },
});

/** 课表共享按学号查询：按查询者 userId，1 分钟 20 次 */
export const courseShareLookupRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  // 自定义 key：查询者 uid（requireAppAuth 已挂在前）
  keyGenerator: (req: Request) => {
    const uid = req.appAuth?.uid;
    return uid != null ? `course-share:${uid}` : `course-share-ip:${req.ip ?? "unknown"}`;
  },
  message: { code: 40001, message: "查询过于频繁，请稍后再试", data: null },
});
