/**
 * Concurrent ingest load generator for Go Track / Node PoC.
 * Usage:
 *   node loadtest.mjs --url http://127.0.0.1:8081 --token xxx --rps 30 --duration 180 --batch 40 --label go
 */
import http from "node:http";
import { performance } from "node:perf_hooks";
import { writeFileSync, mkdirSync } from "node:fs";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const URL_BASE = arg("url", "http://127.0.0.1:8081");
const TOKEN = arg("token", "");
const RPS = Number(arg("rps", "30"));
const DURATION_SEC = Number(arg("duration", "180"));
const BATCH = Number(arg("batch", "40"));
const LABEL = arg("label", "run");
const OUT_DIR = arg("out", "./out");
const CONCURRENCY = Number(arg("concurrency", String(Math.min(64, Math.max(8, RPS)))));

if (!TOKEN) {
  console.error("missing --token");
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
const runId = `${LABEL}-${Date.now()}`;
let seq = 0;
let inFlight = 0;
let sent = 0;
let ok = 0;
let fail = 0;
let rateLimited = 0;
const latencies = [];
const errors = [];

function nextSeq() {
  seq += 1;
  return seq;
}

function buildBody() {
  const n = nextSeq();
  const userId = 900000 + (n % 200); // 200 synthetic users
  const now = Date.now();
  const events = [];
  for (let i = 0; i < BATCH; i++) {
    const id = `lt-${runId}-${n}-${i}`;
    events.push({
      event_id: id,
      event_type: "screen_view",
      event_name: "LoadTestHome",
      client_ts_ms: now,
      session_id: `s-${userId}`,
      app_version: "loadtest",
      platform: "android",
      device_brand: "bench",
    });
  }
  return {
    user_id: userId,
    student_no: `loadtest_${userId}`,
    events,
  };
}

function postOnce() {
  return new Promise((resolve) => {
    const body = JSON.stringify(buildBody());
    const u = new URL("/v1/internal/events", URL_BASE);
    const start = performance.now();
    const req = http.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port,
        path: u.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "X-Internal-Token": TOKEN,
          Connection: "keep-alive",
        },
        timeout: 15000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const ms = performance.now() - start;
          latencies.push(ms);
          if (res.statusCode === 200) ok++;
          else {
            fail++;
            if (res.statusCode === 429) rateLimited++;
            if (errors.length < 20) {
              errors.push({
                status: res.statusCode,
                body: Buffer.concat(chunks).toString("utf8").slice(0, 200),
              });
            }
          }
          resolve();
        });
      },
    );
    req.on("error", (e) => {
      latencies.push(performance.now() - start);
      fail++;
      if (errors.length < 20) errors.push({ status: 0, body: String(e.message) });
      resolve();
    });
    req.on("timeout", () => {
      req.destroy();
    });
    req.write(body);
    req.end();
  });
}

async function worker(stopAt) {
  while (Date.now() < stopAt) {
    inFlight++;
    sent++;
    await postOnce();
    inFlight--;
  }
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const idx = Math.min(a.length - 1, Math.floor((p / 100) * a.length));
  return a[idx];
}

const startedAt = Date.now();
const stopAt = startedAt + DURATION_SEC * 1000;
const intervalMs = 1000 / RPS;
let launched = 0;

console.log(
  JSON.stringify({
    msg: "loadtest start",
    runId,
    url: URL_BASE,
    rps: RPS,
    durationSec: DURATION_SEC,
    batch: BATCH,
    concurrency: CONCURRENCY,
  }),
);

const launchTimer = setInterval(() => {
  if (Date.now() >= stopAt) {
    clearInterval(launchTimer);
    return;
  }
  if (inFlight >= CONCURRENCY) return;
  launched++;
  inFlight++;
  sent++;
  postOnce().finally(() => {
    inFlight--;
  });
}, intervalMs);

await new Promise((r) => setTimeout(r, DURATION_SEC * 1000 + 2000));
// drain
while (inFlight > 0) {
  await new Promise((r) => setTimeout(r, 100));
}

const elapsedSec = (Date.now() - startedAt) / 1000;
const summary = {
  runId,
  label: LABEL,
  url: URL_BASE,
  targetRps: RPS,
  durationSec: DURATION_SEC,
  batch: BATCH,
  elapsedSec,
  sent,
  ok,
  fail,
  rateLimited,
  successRate: sent ? ok / sent : 0,
  achievedRps: ok / elapsedSec,
  eventsOkEstimate: ok * BATCH,
  latencyMs: {
    p50: Number(percentile(latencies, 50).toFixed(2)),
    p95: Number(percentile(latencies, 95).toFixed(2)),
    p99: Number(percentile(latencies, 99).toFixed(2)),
    max: Number((latencies.length ? Math.max(...latencies) : 0).toFixed(2)),
  },
  errors,
};

const outFile = `${OUT_DIR}/${LABEL}-loadtest.json`;
writeFileSync(outFile, JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ msg: "loadtest done", outFile, summary }, null, 2));
