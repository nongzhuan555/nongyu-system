import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Fastify from "fastify";
import { SignJWT } from "jose";
import { afterEach, describe, expect, it } from "vitest";
import pino from "pino";
import { Jobs } from "../aggregate/jobs.js";
import type { Config } from "../config/env.js";
import { registerRoutes } from "../http/routes.js";
import { Writer } from "../ingest/writer.js";
import { openStore } from "../store/sqlite/db.js";
import { Syncer } from "../usersync/index.js";

const secret = "test-jwt-secret-at-least-32-bytes!!";
const internal = "internal-token-test";

async function makeApp() {
  const dir = mkdtempSync(join(tmpdir(), "ny-track-"));
  const store = openStore(join(dir, "track.db"));
  const log = pino({ level: "silent" });
  const syncer = new Syncer("http://127.0.0.1:9", "x", log);
  const writer = new Writer(store, syncer, 128);
  const jobs = new Jobs(store, log);
  const cfg: Config = {
    httpAddr: "127.0.0.1:0",
    dbPath: join(dir, "track.db"),
    jwtSecret: secret,
    internalToken: internal,
    nodeInternalBaseUrl: "http://127.0.0.1:9",
    nodeInternalToken: "x",
    presenceOfflineAfterMs: 600_000,
    writeQueueSize: 128,
    bodyLimitBytes: 1 << 20,
    userRatePerMin: 10_000,
    ipRatePerMin: 10_000,
    webSiteKey: "web-site-key-test",
  };
  const app = Fastify({ logger: false, bodyLimit: cfg.bodyLimitBytes });
  await registerRoutes(app, { cfg, store, writer, syncer, jobs });
  await app.ready();
  return { app, store, writer, syncer, dir };
}

async function appJwt(uid = 1): Promise<string> {
  return new SignJWT({ uid, typ: "app", studentNo: "S1" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(secret));
}

describe("http basic", () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    while (cleanups.length) {
      await cleanups.pop()!();
    }
  });

  it("health ok", async () => {
    const ctx = await makeApp();
    cleanups.push(async () => {
      await ctx.app.close();
      ctx.writer.stop();
      await ctx.syncer.stop();
      ctx.store.close();
      rmSync(ctx.dir, { recursive: true, force: true });
    });
    const res = await ctx.app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, data: { status: "up", db: "ok" } });
  });

  it("ingest accepts and duplicates", async () => {
    const ctx = await makeApp();
    cleanups.push(async () => {
      await ctx.app.close();
      ctx.writer.stop();
      await ctx.syncer.stop();
      ctx.store.close();
      rmSync(ctx.dir, { recursive: true, force: true });
    });
    const token = await appJwt();
    const event = {
      event_id: "550e8400-e29b-41d4-a716-446655440099",
      event_type: "app_open",
      event_name: "launch",
      session_id: "s1",
      app_version: "1.0.0",
      platform: "android",
      client_ts_ms: Date.now(),
    };
    const r1 = await ctx.app.inject({
      method: "POST",
      url: "/v1/track/events",
      headers: { authorization: `Bearer ${token}` },
      payload: { events: [event] },
    });
    expect(r1.statusCode).toBe(200);
    expect(r1.json().data.accepted).toBe(1);

    const r2 = await ctx.app.inject({
      method: "POST",
      url: "/v1/track/events",
      headers: { authorization: `Bearer ${token}` },
      payload: { events: [event] },
    });
    expect(r2.statusCode).toBe(200);
    expect(r2.json().data.duplicated).toBe(1);
  });

  it("internal skip presence still writes", async () => {
    const ctx = await makeApp();
    cleanups.push(async () => {
      await ctx.app.close();
      ctx.writer.stop();
      await ctx.syncer.stop();
      ctx.store.close();
      rmSync(ctx.dir, { recursive: true, force: true });
    });
    const res = await ctx.app.inject({
      method: "POST",
      url: "/v1/internal/events",
      headers: { "x-internal-token": internal },
      payload: {
        user_id: 42,
        events: [
          {
            event_id: "550e8400-e29b-41d4-a716-446655440088",
            event_type: "llm_proxy_fail",
            event_name: "50210",
          },
        ],
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.accepted).toBe(1);
    const n = ctx.store.db.prepare(`SELECT COUNT(*) AS n FROM user_presence`).get() as {
      n: number;
    };
    expect(n.n).toBe(0);
  });

  it("web ingest accepts allowlisted events", async () => {
    const ctx = await makeApp();
    cleanups.push(async () => {
      await ctx.app.close();
      ctx.writer.stop();
      await ctx.syncer.stop();
      ctx.store.close();
      rmSync(ctx.dir, { recursive: true, force: true });
    });
    const event = {
      event_id: "550e8400-e29b-41d4-a716-446655440077",
      event_type: "screen_view",
      event_name: "web_home",
      session_id: "web-s1",
      app_version: "web-site",
      platform: "web",
      client_ts_ms: Date.now(),
    };
    const ok = await ctx.app.inject({
      method: "POST",
      url: "/v1/track/web/events",
      headers: { "x-site-key": "web-site-key-test" },
      payload: { events: [event] },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().data.accepted).toBe(1);

    const badKey = await ctx.app.inject({
      method: "POST",
      url: "/v1/track/web/events",
      headers: { "x-site-key": "wrong" },
      payload: { events: [event] },
    });
    expect(badKey.statusCode).toBe(401);

    const notAllowed = await ctx.app.inject({
      method: "POST",
      url: "/v1/track/web/events",
      headers: { "x-site-key": "web-site-key-test" },
      payload: {
        events: [
          {
            ...event,
            event_id: "550e8400-e29b-41d4-a716-446655440066",
            event_type: "app_open",
            event_name: "launch",
          },
        ],
      },
    });
    expect(notAllowed.statusCode).toBe(200);
    expect(notAllowed.json().data.accepted).toBe(0);
    expect(notAllowed.json().data.rejected).toBe(1);
  });
});
