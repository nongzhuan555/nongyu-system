#!/usr/bin/env bash
# Track 机：备份 → 切到正式 Node → 抬高限流压测 → 清 loadtest 数据 → 恢复限流
# 假定 /opt/nongyu-track 已由 publish-track 发布且 systemd 已指向 Node。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
OUT="${ROOT}/out-full-node"
mkdir -p "$OUT"

NODE_BIN="${NODE_BIN:-/opt/node-v21/bin/node}"
BENCH_RPS="${BENCH_RPS:-30}"
BENCH_DURATION="${BENCH_DURATION:-180}"
BENCH_BATCH="${BENCH_BATCH:-40}"
ENV_FILE=/etc/nongyu-track.env
DB=/var/lib/nongyu-track/track.db
BACKUP_DIR=/var/backups/nongyu-track
STAMP=$(date +%Y%m%d-%H%M%S)

TOKEN=$(grep '^INTERNAL_TOKEN=' "$ENV_FILE" | head -1 | cut -d= -f2-)
if [ -z "$TOKEN" ]; then
  echo "missing INTERNAL_TOKEN" >&2
  exit 1
fi
if [ ! -x "$NODE_BIN" ]; then
  echo "missing NODE_BIN=$NODE_BIN" >&2
  exit 1
fi

summarize_csv() {
  local csv="$1" out="$2"
  awk -F, 'NR>1 {rss=$2; cpu=$3; n++; sumr+=rss; if(rss>maxr)maxr=rss; sumc+=cpu; if(cpu>maxc)maxc=cpu}
    END{ if(n<1){print "{}"; exit}
      printf "{\"samples\":%d,\"rss_kb_avg\":%.1f,\"rss_kb_max\":%.1f,\"cpu_pct_avg\":%.2f,\"cpu_pct_max\":%.2f}\n", n, sumr/n, maxr, sumc/n, maxc }' "$csv" > "$out"
}

echo "=== 0) cold backup track.db ==="
mkdir -p "$BACKUP_DIR"
systemctl stop nongyu-track || true
# 若仍是 Go 刚停，SQLite 冷备；切 Node 后也会在压测前再备一次
if [ -f "$DB" ]; then
  sqlite3 "$DB" ".backup '$BACKUP_DIR/track.db.pre-node-cutover-$STAMP'"
  cp -a "$DB" "$BACKUP_DIR/track.db.pre-node-cutover-$STAMP.rawcopy" 2>/dev/null || true
  ls -la "$BACKUP_DIR"/track.db.pre-node-cutover-"$STAMP"* | tee "$OUT/backup-ls.txt"
fi

echo "=== 1) ensure Node unit active ==="
systemctl start nongyu-track
sleep 2
systemctl is-active nongyu-track
curl -sf http://127.0.0.1:8081/health | tee "$OUT/health-before.json"
echo
MAIN_PID=$(systemctl show nongyu-track -p MainPID --value)
ps -p "$MAIN_PID" -o pid=,rss=,%cpu=,etime=,cmd= | tee "$OUT/idle.txt"
free -h | tee "$OUT/idle-free.txt"
# 确认是 node 进程
tr '\0' ' ' < /proc/"$MAIN_PID"/cmdline | tee "$OUT/cmdline.txt"
echo

echo "=== 2) raise rate limits for bench (temp) ==="
cp -a "$ENV_FILE" "$BACKUP_DIR/nongyu-track.env.pre-bench-$STAMP"
# 去掉旧限流行后追加高压测值
grep -vE '^(IP_RATE_PER_MIN|USER_RATE_PER_MIN)=' "$ENV_FILE" > /tmp/nongyu-track.env.bench
printf 'IP_RATE_PER_MIN=60000\nUSER_RATE_PER_MIN=60000\n' >> /tmp/nongyu-track.env.bench
cp /tmp/nongyu-track.env.bench "$ENV_FILE"
systemctl restart nongyu-track
sleep 2
MAIN_PID=$(systemctl show nongyu-track -p MainPID --value)
curl -sf http://127.0.0.1:8081/health >/dev/null

echo "=== 3) loadtest formal Node ${BENCH_RPS}rps x ${BENCH_DURATION}s ==="
chmod +x "$ROOT/sample-metrics.sh"
"$ROOT/sample-metrics.sh" "$MAIN_PID" "$OUT/full-node-metrics.csv" $((BENCH_DURATION + 20)) &
SAMP=$!
"$NODE_BIN" "$ROOT/loadtest.mjs" \
  --url http://127.0.0.1:8081 \
  --token "$TOKEN" \
  --rps "$BENCH_RPS" \
  --duration "$BENCH_DURATION" \
  --batch "$BENCH_BATCH" \
  --label full-node \
  --out "$OUT" | tee "$OUT/full-node-loadtest.log"
wait "$SAMP" || true
summarize_csv "$OUT/full-node-metrics.csv" "$OUT/full-node-metrics-summary.json"
ps -p "$MAIN_PID" -o pid=,rss=,%cpu=,etime= > "$OUT/full-node-after.txt" || true
du -sh /var/lib/nongyu-track | tee "$OUT/db-size-after.txt"
sqlite3 "$DB" "SELECT COUNT(*) FROM events WHERE student_no LIKE 'loadtest_%';" | tee "$OUT/loadtest-rows.txt"

echo "=== 4) cleanup loadtest rows ==="
sqlite3 "$DB" "DELETE FROM events WHERE student_no LIKE 'loadtest_%';"
sqlite3 "$DB" "SELECT COUNT(*) FROM events WHERE student_no LIKE 'loadtest_%';" | tee "$OUT/loadtest-rows-after-clean.txt"

echo "=== 5) restore rate limits ==="
cp -a "$BACKUP_DIR/nongyu-track.env.pre-bench-$STAMP" "$ENV_FILE"
systemctl restart nongyu-track
sleep 2
curl -sf http://127.0.0.1:8081/health | tee "$OUT/health-after.json"
echo
systemctl show nongyu-track -p MainPID --value | tee "$OUT/pid-final.txt"
ps -p "$(cat "$OUT/pid-final.txt")" -o pid=,rss=,%cpu=,cmd= | tee "$OUT/final-ps.txt" || true

echo "=== DONE ==="
ls -la "$OUT"
