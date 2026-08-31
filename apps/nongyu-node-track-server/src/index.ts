import Fastify from "fastify";
import pino from "pino";
import { Jobs } from "./aggregate/jobs.js";
import { loadConfig } from "./config/env.js";
import { registerRoutes } from "./http/routes.js";
import { Writer } from "./ingest/writer.js";
import { Scanner } from "./presence/scanner.js";
import { openStore } from "./store/sqlite/db.js";
import { Syncer } from "./usersync/index.js";

async function main(): Promise<void> {
  const log = pino({ level: "info" });
  const cfg = loadConfig();
  const store = openStore(cfg.dbPath);
  const syncer = new Syncer(cfg.nodeInternalBaseUrl, cfg.nodeInternalToken, log);
  const writer = new Writer(store, syncer, cfg.writeQueueSize);
  const jobs = new Jobs(store, log);
  const scanner = new Scanner(store, syncer, cfg.presenceOfflineAfterMs, log);

  jobs.start();
  scanner.start();

  const app = Fastify({
    logger: false,
    bodyLimit: cfg.bodyLimitBytes,
    requestTimeout: 30_000,
  });

  await registerRoutes(app, { cfg, store, writer, syncer, jobs });

  const listenTarget = parseListenAddr(cfg.httpAddr);
  await app.listen(listenTarget);
  log.info({ addr: cfg.httpAddr }, "listen");

  const shutdown = async () => {
    try {
      await app.close();
    } catch (err) {
      log.error({ err }, "http close");
    }
    await scanner.stop();
    await jobs.stop();
    writer.stop();
    await syncer.stop();
    store.close();
    log.info("stopped");
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

function parseListenAddr(addr: string): { host: string; port: number } {
  // 支持 127.0.0.1:8081 或 :8081
  if (addr.startsWith(":")) {
    return { host: "0.0.0.0", port: Number(addr.slice(1)) };
  }
  const idx = addr.lastIndexOf(":");
  if (idx < 0) throw new Error(`invalid HTTP_ADDR: ${addr}`);
  return { host: addr.slice(0, idx), port: Number(addr.slice(idx + 1)) };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
