#!/usr/bin/env bash
# Orchestrate Go vs Node PoC ingest bench on Track host.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
OUT="$ROOT/out"
NODE_DIR="/opt/node-v22"
POC_DIR="/opt/nongyu-track-node-poc"
POC_PORT=18081
POC_DB="$POC_DIR/poc-track.db"
BENCH_RPS="${BENCH_RPS:-30}"
BENCH_DURATION="${BENCH_DURATION:-180}"
BENCH_BATCH="${BENCH_BATCH:-40}"

mkdir -p "$OUT" "$POC_DIR"

TOKEN=$(grep '^INTERNAL_TOKEN=' /etc/nongyu-track.env | head -1 | cut -d= -f2-)
if [ -z "$TOKEN" ]; then
  echo "missing INTERNAL_TOKEN" >&2
  exit 1
fi

echo "=== 0) install Node 22 if needed ==="
if [ ! -x "$NODE_DIR/bin/node" ]; then
  cd /tmp
  curl -fsSL -o node.tar.xz https://nodejs.org/dist/v22.18.0/node-v22.18.0-linux-x64.tar.xz
  mkdir -p /opt
  tar -xJf node.tar.xz -C /opt
  mv /opt/node-v22.18.0-linux-x64 "$NODE_DIR"
fi
"$NODE_DIR/bin/node" -v

echo "=== 1) backup Go binary & raise rate limit via rebuild note ==="
# Production binary hardcodes IP 300/min. For peak RPS we swap in a high-limit binary built on CI/local.
# If bench binary exists, use it; else temporarily patch by env is unavailable — require /usr/local/bin/nongyu-track-bench
GO_BIN=/usr/local/bin/nongyu-track
GO_BAK=/usr/local/bin/nongyu-track.pre-bench.bak
GO_BENCH=/usr/local/bin/nongyu-track-bench

if [ ! -x "$GO_BENCH" ]; then
  echo "ERROR: missing $GO_BENCH (high rate-limit build). Upload it first." >&2
  exit 1
fi

cp -a "$ROOT/poc-server.mjs" "$POC_DIR/poc-server.mjs"
cp -a "$ROOT/loadtest.mjs" "$POC_DIR/loadtest.mjs"
cp -a "$ROOT/sample-metrics.sh" "$POC_DIR/sample-metrics.sh"
chmod +x "$POC_DIR/sample-metrics.sh"

idle_snapshot() {
  local name="$1" pid="$2"
  ps -p "$pid" -o pid=,rss=,%cpu=,etime=,nlwp= > "$OUT/${name}-idle.txt" || true
  free -h > "$OUT/${name}-idle-free.txt" || true
}

summarize_csv() {
  local csv="$1" out="$2"
  awk -F, 'NR>1 {rss=$2; cpu=$3; n++; sumr+=rss; if(rss>maxr)maxr=rss; sumc+=cpu; if(cpu>maxc)maxc=cpu}
    END{ if(n<1){print "{}"; exit}
      printf "{\"samples\":%d,\"rss_kb_avg\":%.1f,\"rss_kb_max\":%.1f,\"cpu_pct_avg\":%.2f,\"cpu_pct_max\":%.2f}\n", n, sumr/n, maxr, sumc/n, maxc }' "$csv" > "$out"
}

echo "=== 2) Go idle snapshot ==="
systemctl start nongyu-track
sleep 1
GO_PID=$(systemctl show nongyu-track -p MainPID --value)
idle_snapshot go "$GO_PID"
curl -sS http://127.0.0.1:8081/health | tee "$OUT/go-health-before.json"
echo

echo "=== 3) swap high-limit Go binary ==="
systemctl stop nongyu-track
if [ ! -f "$GO_BAK" ]; then cp -a "$GO_BIN" "$GO_BAK"; fi
cp -a "$GO_BENCH" "$GO_BIN"
systemctl start nongyu-track
sleep 1
GO_PID=$(systemctl show nongyu-track -p MainPID --value)
echo "GO_PID=$GO_PID"

echo "=== 4) Go loadtest ${BENCH_RPS}rps x ${BENCH_DURATION}s ==="
"$POC_DIR/sample-metrics.sh" "$GO_PID" "$OUT/go-metrics.csv" $((BENCH_DURATION + 20)) &
SAMP_GO=$!
"$NODE_DIR/bin/node" "$POC_DIR/loadtest.mjs" \
  --url http://127.0.0.1:8081 \
  --token "$TOKEN" \
  --rps "$BENCH_RPS" \
  --duration "$BENCH_DURATION" \
  --batch "$BENCH_BATCH" \
  --label go \
  --out "$OUT" | tee "$OUT/go-loadtest.log"
wait "$SAMP_GO" || true
summarize_csv "$OUT/go-metrics.csv" "$OUT/go-metrics-summary.json"
ps -p "$GO_PID" -o pid=,rss=,%cpu=,etime= > "$OUT/go-after.txt" || true
du -sh /var/lib/nongyu-track | tee "$OUT/go-db-size-after.txt"
sqlite3 /var/lib/nongyu-track/track.db "SELECT COUNT(*) FROM events WHERE student_no LIKE 'loadtest_%';" | tee "$OUT/go-loadtest-rows.txt"

echo "=== 5) cleanup Go loadtest rows ==="
sqlite3 /var/lib/nongyu-track/track.db "DELETE FROM events WHERE student_no LIKE 'loadtest_%';"
sqlite3 /var/lib/nongyu-track/track.db "VACUUM;" || true
# restore original binary
systemctl stop nongyu-track
cp -a "$GO_BAK" "$GO_BIN"
systemctl start nongyu-track
sleep 1
curl -sS http://127.0.0.1:8081/health | tee "$OUT/go-health-after-restore.json"
echo

echo "=== 6) start Node PoC ==="
rm -f "$POC_DB" "$POC_DB"-wal "$POC_DB"-shm
export INTERNAL_TOKEN="$TOKEN"
export POC_PORT="$POC_PORT"
export POC_DB_PATH="$POC_DB"
nohup "$NODE_DIR/bin/node" "$POC_DIR/poc-server.mjs" > "$OUT/poc-server.log" 2>&1 &
echo $! > "$OUT/poc.pid"
sleep 1
POC_PID=$(cat "$OUT/poc.pid")
idle_snapshot node-poc "$POC_PID"
curl -sS "http://127.0.0.1:${POC_PORT}/health" | tee "$OUT/node-health-before.json"
echo

echo "=== 7) Node PoC loadtest ==="
"$POC_DIR/sample-metrics.sh" "$POC_PID" "$OUT/node-metrics.csv" $((BENCH_DURATION + 20)) &
SAMP_NODE=$!
"$NODE_DIR/bin/node" "$POC_DIR/loadtest.mjs" \
  --url "http://127.0.0.1:${POC_PORT}" \
  --token "$TOKEN" \
  --rps "$BENCH_RPS" \
  --duration "$BENCH_DURATION" \
  --batch "$BENCH_BATCH" \
  --label node \
  --out "$OUT" | tee "$OUT/node-loadtest.log"
wait "$SAMP_NODE" || true
summarize_csv "$OUT/node-metrics.csv" "$OUT/node-metrics-summary.json"
ps -p "$POC_PID" -o pid=,rss=,%cpu=,etime= > "$OUT/node-after.txt" || true
du -sh "$POC_DIR" | tee "$OUT/node-db-size-after.txt"
sqlite3 "$POC_DB" "SELECT COUNT(*) FROM events;" | tee "$OUT/node-rows.txt"

echo "=== 8) stop Node PoC ==="
kill "$POC_PID" || true
sleep 1

echo "=== DONE ==="
ls -la "$OUT"
