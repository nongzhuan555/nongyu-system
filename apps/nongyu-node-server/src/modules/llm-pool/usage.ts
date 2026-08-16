import { getEnv } from "../../config/env.js";
import { AppError, ErrorCodes } from "../../lib/errors.js";
import { businessDayUtcRange } from "../../lib/time.js";
import { getLlmPoolConfig } from "./config.js";
import { getUserDailyCount, incrementUserDailyCount } from "./repo.js";

export async function assertUnderDailyLimit(userId: number): Promise<void> {
  const cfg = getLlmPoolConfig();
  const { dateKey } = businessDayUtcRange(getEnv().BUSINESS_TZ);
  const count = await getUserDailyCount(userId, dateKey);
  if (count >= cfg.userDailyLimit) {
    throw new AppError(
      ErrorCodes.LLM_USER_DAILY_LIMIT,
      "今日平台模型次数已用完，请配置自有 Key 或明日再试",
      429,
    );
  }
}

export async function recordDailyUsage(userId: number): Promise<void> {
  const { dateKey } = businessDayUtcRange(getEnv().BUSINESS_TZ);
  await incrementUserDailyCount(userId, dateKey);
}
