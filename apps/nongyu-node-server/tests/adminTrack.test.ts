import http from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetEnvCache } from "../src/config/env.js";
import { ErrorCodes } from "../src/lib/errors.js";
import {
  adminLogin,
  api,
  cleanupTestDb,
  ensureMigrated,
  promoteAdmin,
  registerAppUser,
  truncateAll,
} from "./helpers.js";

describe("admin.track", () => {
  let hitCount = 0;
  let mode: "ok" | "fail" = "ok";
  let server: http.Server;
  let adminToken = "";

  beforeAll(async () => {
    await ensureMigrated();
    server = http.createServer((req, res) => {
      hitCount += 1;
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      res.setHeader("Content-Type", "application/json");
      if (mode === "fail") {
        res.statusCode = 200;
        res.end(JSON.stringify({ ok: false, error: { code: "INTERNAL", message: "boom" } }));
        return;
      }
      if (url.pathname === "/v1/admin/sql/query") {
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });
        req.on("end", () => {
          const rawBody = Buffer.concat(chunks).toString("utf8");
          let sql = "";
          try {
            sql = String((JSON.parse(rawBody) as { sql?: string }).sql ?? "");
          } catch {
            sql = "";
          }
          if (/delete|insert|meta_jobs/i.test(sql)) {
            res.statusCode = 400;
            res.end(
              JSON.stringify({
                ok: false,
                error: { code: "INVALID_SQL", message: "only a single SELECT is allowed" },
              }),
            );
            return;
          }
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              ok: true,
              data: {
                sql: "SELECT * FROM (SELECT metric_key FROM daily_metrics) AS _ny_q LIMIT 501",
                columns: ["metric_key", "metric_value"],
                rows: [{ metric_key: "dau", metric_value: 12 }],
                truncated: false,
                row_count: 1,
              },
            }),
          );
        });
        return;
      }
      if (url.pathname === "/v1/admin/overview") {
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            ok: true,
            data: {
              date: url.searchParams.get("date"),
              dau: 12,
              crash_count: 1,
              app_open_count: 20,
              screen_view_count: 40,
              button_click_count: 8,
              online: 99,
            },
          }),
        );
        return;
      }
      if (url.pathname === "/v1/admin/metrics/dims") {
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            ok: true,
            data: {
              date: url.searchParams.get("date"),
              metric: url.searchParams.get("metric"),
              items: [{ dim_key: "name", dim_value: "Home", metric_value: 3 }],
            },
          }),
        );
        return;
      }
      if (url.pathname === "/v1/admin/crashes") {
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            ok: true,
            data: {
              list: [
                {
                  event_id: "e1",
                  user_id: 1,
                  student_no: "202300001",
                  event_name: "js_error",
                  app_version: "1.0.0",
                  platform: "android",
                  device_brand: "xiaomi",
                  client_ts_ms: 1,
                  received_at_ms: 2,
                  stat_date: "2026-08-15",
                  props: { message: "boom", password: "secret", token: "abc" },
                },
              ],
              total: 1,
              page: 1,
              page_size: 20,
            },
          }),
        );
        return;
      }
      if (url.pathname === "/v1/admin/metrics/trend") {
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            ok: true,
            data: [{ date: "2026-08-14", value: 5 }],
          }),
        );
        return;
      }
      res.statusCode = 404;
      res.end(JSON.stringify({ ok: false, error: { code: "BAD_REQUEST", message: "no" } }));
    });
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("mock track 未绑定端口");
    }
    process.env.TRACK_BASE_URL = `http://127.0.0.1:${address.port}`;
    resetEnvCache();
  });

  beforeEach(async () => {
    await truncateAll();
    hitCount = 0;
    mode = "ok";
    await registerAppUser({ studentNo: "202366666", deviceId: "track-a" });
    await promoteAdmin("202366666", "AdminPass1");
    adminToken = await adminLogin("202366666", "AdminPass1");
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await cleanupTestDb();
  });

  it("maps overview to camelCase and drops online", async () => {
    const res = await api()
      .get("/api/admin/track/overview?date=2026-08-15")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data).toEqual({
      date: "2026-08-15",
      dau: 12,
      crashCount: 1,
      appOpenCount: 20,
      screenViewCount: 40,
      buttonClickCount: 8,
    });
    expect(res.body.data.online).toBeUndefined();
  });

  it("rejects invalid dim metric without calling track", async () => {
    const res = await api()
      .get("/api/admin/track/dims?metric=not_a_metric")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(400);
    expect(res.body.code).toBe(ErrorCodes.VALIDATION);
    expect(hitCount).toBe(0);
  });

  it("maps crashes and strips secret props", async () => {
    const res = await api()
      .get("/api/admin/track/crashes?from=2026-08-15&to=2026-08-15")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.list[0].eventId).toBe("e1");
    expect(res.body.data.list[0].props).toEqual({ message: "boom" });
    expect(res.body.data.pageSize).toBe(20);
  });

  it("maps trend points", async () => {
    const res = await api()
      .get("/api/admin/track/trend?metric=dau&from=2026-08-01&to=2026-08-15")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.points).toEqual([{ date: "2026-08-14", value: 5 }]);
  });

  it("returns 502 when track ok is false", async () => {
    mode = "fail";
    const res = await api()
      .get("/api/admin/track/overview?date=2026-08-15")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(502);
    expect(res.body.code).toBe(ErrorCodes.TRACK_BAD_GATEWAY);
  });

  it("returns 503 when track is unreachable", async () => {
    const previous = process.env.TRACK_BASE_URL;
    process.env.TRACK_BASE_URL = "http://127.0.0.1:1";
    resetEnvCache();
    const res = await api()
      .get("/api/admin/track/overview?date=2026-08-15")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(503);
    expect(res.body.code).toBe(ErrorCodes.TRACK_UNAVAILABLE);
    expect(String(res.body.message)).not.toContain("127.0.0.1");
    process.env.TRACK_BASE_URL = previous;
    resetEnvCache();
  });

  it("rejects missing jwt", async () => {
    await api().get("/api/admin/track/overview").expect(401);
  });

  it("maps sql query to camelCase", async () => {
    const res = await api()
      .post("/api/admin/track/query")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ sql: "SELECT metric_key FROM daily_metrics" })
      .expect(200);
    expect(res.body.data.rowCount).toBe(1);
    expect(res.body.data.columns).toEqual(["metric_key", "metric_value"]);
    expect(res.body.data.truncated).toBe(false);
  });

  it("maps invalid sql to 40001", async () => {
    const res = await api()
      .post("/api/admin/track/query")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ sql: "DELETE FROM daily_metrics" })
      .expect(400);
    expect(res.body.code).toBe(ErrorCodes.VALIDATION);
  });

  it("rejects empty sql", async () => {
    await api()
      .post("/api/admin/track/query")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ sql: "  " })
      .expect(400);
  });

  it("does not expose track jobs", async () => {
    await api()
      .get("/api/admin/track/jobs/aggregate")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(404);
  });
});
