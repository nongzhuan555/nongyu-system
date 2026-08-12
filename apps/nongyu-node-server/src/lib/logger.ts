import pino from "pino";
import { getEnv } from "../config/env.js";

export function createLogger() {
  const env = getEnv();
  return pino({
    level: env.NODE_ENV === "test" ? "silent" : "info",
    transport:
      env.NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } }
        : undefined,
  });
}

export type Logger = ReturnType<typeof createLogger>;
