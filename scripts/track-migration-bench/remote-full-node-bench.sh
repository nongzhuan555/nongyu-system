#!/usr/bin/env bash
# 正式 Node Track 压测（同历史 PoC：30 batch/s × 40 × 180s）
set -eo pipefail
export PATH=/opt/node-v21/bin:/usr/local/bin:$PATH
export MANPATH="${MANPATH:-}"

ROOT=/opt/track-migration-bench
OUT="$ROOT/out-full-node"
mkdir -p "$OUT"
cp -a /tmp/loadtest.mjs "$ROOT/loadtest.mjs"
cp -a /tmp/sample-metrics.sh "$ROOT/sample-metrics.sh"
chmod +x "$ROOT/sample-metrics.sh"
sed -i 's/\r$//' "$ROOT/sample-metrics.sh" "$ROOT/loadtest.mjs" 2>/dev/null || true

ENV_FILE=/etc/nongyu-track.env
DB=/var/lib/nongyu-track/track.db
STAMP=$(date +%Y%m%d-%H%M%S)
BENCH_RPS=30
BENCH_DURATION=180
BENCH_BATCH=40

TOKEN=$(grep '^INTERNAL_TOKEN=' "$ENV_FILE" | head -1 | cut -d= -f2-)
test -n "$TOKEN"

summarize_csv() {
  local csv="$1" out="$2"
  awk -F, 'NR>1 {rss=$2; cpu=$3; n++; sumr+=rss; if(rss>maxr)maxr=rss; sumc+=cpu; if(cpu>maxc)maxc=cpu}
    END{ if(n<1){print "{}"; exit}
      printf "{\"samples\":%d,\"rss_kb_avg\":%.1f,\"rss_kb_max\":%.1f,\"cpu_pct_avg\":%.2f,\"cpu_pct_max\":%.2f}\n", n, sumr/n, maxr, sumc/n, maxc }' "$csv" > "$out"
}

echo "=== health / idle ==="
curl -sf http://127.0.0.1:8081/health | tee "$OUT/health-before.json"
echo
MAIN_PID=$(systemctl show nongyu-track -p MainPID --value)
ps -p "$MAIN_PID" -o pid=,user=,rss=,%cpu=,args= | tee "$OUT/idle-ps.txt"
free -h | tee "$OUT/idle-free.txt"
tr '\0' ' ' < /proc/"$MAIN_PID"/cmdline | tee "$OUT/cmdline.txt"
echo

echo "=== raise rate limits for bench ==="
cp -a "$ENV_FILE" "/var/backups/nongyu-track/nongyu-track.env.pre-bench-$STAMP"
grep -vE '^(IP_RATE_PER_MIN|USER_RATE_PER_MIN|WRITE_QUEUE_SIZE)=' "$ENV_FILE" > /tmp/nongyu-track.env.bench
printf 'IP_RATE_PER_MIN=60000\nUSER_RATE_PER_MIN=60000\nWRITE_QUEUE_SIZE=1024\n' >> /tmp/nongyu-track.env.bench
cp /tmp/nongyu-track.env.bench "$ENV_FILE"
systemctl restart nongyu-track
sleep 2
MAIN_PID=$(systemctl show nongyu-track -p MainPID --value)
curl -sf http://127.0.0.1:8081/health >/dev/null
ps -p "$MAIN_PID" -o pid=,rss=,%cpu= | tee "$OUT/bench-start-ps.txt"

echo "=== loadtest ${BENCH_RPS}rps x ${BENCH_DURATION}s x batch=${BENCH_BATCH} ==="
"$ROOT/sample-metrics.sh" "$MAIN_PID" "$OUT/full-node-metrics.csv" $((BENCH_DURATION + 20)) &
SAMP=$!
node "$ROOT/loadtest.mjs" \
  --url http://127.0.0.1:8081 \
  --token "$TOKEN" \
  --rps "$BENCH_RPS" \
  --duration "$BENCH_DURATION" \
  --batch "$BENCH_BATCH" \
  --label full-node \
  --out "$OUT" | tee "$OUT/full-node-loadtest.log"
wait "$SAMP" || true
summarize_csv "$OUT/full-node-metrics.csv" "$OUT/full-node-metrics-summary.json"
ps -p "$MAIN_PID" -o pid=,rss=,%cpu=,etime= | tee "$OUT/full-node-after-ps.txt" || true
du -sh /var/lib/nongyu-track | tee "$OUT/db-size-after.txt"
sqlite3 "$DB" "SELECT COUNT(*) FROM events WHERE student_no LIKE 'loadtest_%';" | tee "$OUT/loadtest-rows.txt"

echo "=== cleanup loadtest rows ==="
sqlite3 "$DB" "DELETE FROM events WHERE student_no LIKE 'loadtest_%';"
sqlite3 "$DB" "SELECT COUNT(*) FROM events WHERE student_no LIKE 'loadtest_%';" | tee "$OUT/loadtest-rows-after-clean.txt"

echo "=== restore rate limits ==="
cp -a "/var/backups/nongyu-track/nongyu-track.env.pre-bench-$STAMP" "$ENV_FILE"
systemctl restart nongyu-track
sleep 2
curl -sf http://127.0.0.1:8081/health | tee "$OUT/health-after.json"
echo
MAIN_PID=$(systemctl show nongyu-track -p MainPID --value)
ps -p "$MAIN_PID" -o pid=,user=,rss=,%cpu=,args= | tee "$OUT/final-ps.txt"
echo "BENCH_DONE"
ls -la "$OUT"
