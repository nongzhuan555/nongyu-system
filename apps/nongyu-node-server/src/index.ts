import { loadEnvFiles, getEnv } from "./config/env.js";
import { createApp } from "./app.js";
import { closePool } from "./lib/db.js";
import { createLogger } from "./lib/logger.js";

loadEnvFiles();
const env = getEnv();
const logger = createLogger();
const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "nongyu-node-server listening");
});

async function shutdown(signal: string) {
  logger.info({ signal }, "shutting down");
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
