import { getEnv } from "../../config/env.js";
import { AppError, ErrorCodes } from "../../lib/errors.js";

export type LlmPoolConfig = {
  enabled: boolean;
  defaultModel: string;
  defaultBaseUrl: string;
  queueWaitMs: number;
  firstTokenTimeoutMs: number;
  maxKeyRetries: number;
  userDailyLimit: number;
  leaseMaxMs: number;
};

export function getLlmPoolConfig(): LlmPoolConfig {
  const env = getEnv();
  return {
    enabled: env.LLM_POOL_ENABLED,
    defaultModel: env.LLM_POOL_DEFAULT_MODEL,
    defaultBaseUrl: env.LLM_POOL_DEFAULT_BASE_URL,
    queueWaitMs: env.LLM_POOL_QUEUE_WAIT_MS,
    firstTokenTimeoutMs: env.LLM_POOL_FIRST_TOKEN_TIMEOUT_MS,
    maxKeyRetries: env.LLM_POOL_MAX_KEY_RETRIES,
    userDailyLimit: env.LLM_POOL_USER_DAILY_LIMIT,
    leaseMaxMs: env.LLM_POOL_LEASE_MAX_MS,
  };
}

export function assertPoolEnabled(): LlmPoolConfig {
  const cfg = getLlmPoolConfig();
  if (!cfg.enabled) {
    throw new AppError(ErrorCodes.LLM_POOL_UNAVAILABLE, "平台模型暂不可用", 503);
  }
  return cfg;
}
