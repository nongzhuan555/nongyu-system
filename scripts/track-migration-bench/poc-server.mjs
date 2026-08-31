/**
 * Minimal Node+SQLite track ingest PoC for migration bench.
 * Only implements POST /v1/internal/events + GET /health.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const PORT = Number(process.env.POC_PORT || 18081);
const DB_PATH = process.env.POC_DB_PATH || "./poc-track.db";
const TOKEN = process.env.INTERNAL_TOKEN || "bench-token";

fs.mkdirSync(path.dirname(path.resolve(DB_PATH)), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode=WAL;
  PRAGMA synchronous=NORMAL;
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL,
    user_id INTEGER NULL,
    student_no TEXT NULL,
    event_type TEXT NOT NULL,
    event_name TEXT NOT NULL,
    app_version TEXT NULL,
    platform TEXT NULL,
    device_brand TEXT NULL,
    session_id TEXT NULL,
    duration_ms INTEGER NULL,
    props_json TEXT NULL,
    client_ts_ms INTEGER NULL,
    received_at_ms INTEGER NOT NULL,
    stat_date TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS uk_events_event_id ON events(event_id);
`);

const insert = db.prepare(`
  INSERT OR IGNORE INTO events (
    event_id, user_id, student_no, event_type, event_name,
    app_version, platform, device_brand, session_id, duration_ms,
    props_json, client_ts_ms, received_at_ms, stat_date
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const allowedTypes = new Set([
  "screen_view",
  "button_click",
  "perf",
  "app_open",
  "heartbeat",
  "crash",
  "llm_proxy_fail",
]);

function todayStatDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > 1_000_000) {
        reject(new Error("too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      db.prepare("SELECT 1 AS ok").get();
      return send(res, 200, { ok: true, data: { status: "up", db: "ok" } });
    }

    if (req.method === "POST" && req.url === "/v1/internal/events") {
      if (req.headers["x-internal-token"] !== TOKEN) {
        return send(res, 403, { ok: false, error: { code: "FORBIDDEN" } });
      }
      const raw = await readBody(req);
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return send(res, 400, {
          ok: false,
          error: { code: "BAD_REQUEST", message: "invalid json" },
        });
      }
      const userId = Number(body.user_id);
      const studentNo = typeof body.student_no === "string" ? body.student_no : "";
      const events = Array.isArray(body.events) ? body.events : [];
      if (!Number.isFinite(userId) || userId <= 0) {
        return send(res, 400, {
          ok: false,
          error: { code: "BAD_REQUEST", message: "user_id required" },
        });
      }
      if (events.length < 1 || events.length > 100) {
        return send(res, 400, {
          ok: false,
          error: { code: "BAD_REQUEST", message: "events length must be 1-100" },
        });
      }

      const received = Date.now();
      const statDate = todayStatDate();
      let accepted = 0;
      let duplicated = 0;
      let rejected = 0;
      const errors = [];

      db.exec("BEGIN");
      try {
        for (const ev of events) {
          const eventId = String(ev.event_id || "").trim();
          const eventType = String(ev.event_type || "").trim();
          const eventName = String(ev.event_name || "").trim();
          if (!eventId || !allowedTypes.has(eventType) || !eventName) {
            rejected++;
            errors.push({ event_id: eventId, code: "INVALID_EVENT" });
            continue;
          }
          const info = insert.run(
            eventId,
            userId,
            studentNo || null,
            eventType,
            eventName,
            ev.app_version ? String(ev.app_version) : null,
            ev.platform ? String(ev.platform) : null,
            ev.device_brand ? String(ev.device_brand) : null,
            ev.session_id ? String(ev.session_id) : null,
            ev.duration_ms == null ? null : Number(ev.duration_ms),
            ev.props ? JSON.stringify(ev.props) : null,
            ev.client_ts_ms == null ? null : Number(ev.client_ts_ms),
            received,
            statDate,
          );
          if (info.changes === 0) duplicated++;
          else accepted++;
        }
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }

      return send(res, 200, {
        ok: true,
        data: { accepted, duplicated, rejected, errors },
      });
    }

    send(res, 404, { ok: false, error: { code: "NOT_FOUND" } });
  } catch (e) {
    send(res, 500, { ok: false, error: { code: "INTERNAL", message: String(e?.message || e) } });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(JSON.stringify({ msg: "poc listening", port: PORT, db: DB_PATH, pid: process.pid }));
});
