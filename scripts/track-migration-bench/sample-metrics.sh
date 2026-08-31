#!/usr/bin/env bash
# Sample process RSS/CPU every 2s into a CSV.
# Usage: sample-metrics.sh <pid> <out.csv> <seconds>
set -euo pipefail
PID="$1"
OUT="$2"
SECS="${3:-200}"
HZ=$(getconf CLK_TCK)
echo "ts,rss_kb,cpu_pct,threads" > "$OUT"
END=$(( $(date +%s) + SECS ))
PREV_TICKS=""
PREV_TS=""
while [ "$(date +%s)" -lt "$END" ]; do
  if [ ! -r "/proc/$PID/stat" ]; then
    echo "process gone" >&2
    break
  fi
  RSS=$(awk '/VmRSS:/ {print $2}' "/proc/$PID/status")
  THREADS=$(awk '/Threads:/ {print $2}' "/proc/$PID/status")
  TICKS=$(awk '{print $14+$15}' "/proc/$PID/stat")
  NOW_TS=$(date +%s)
  CPU="0"
  if [ -n "$PREV_TICKS" ]; then
    DT=$((NOW_TS - PREV_TS))
    if [ "$DT" -gt 0 ]; then
      # cpu% of one core
      CPU=$(awk -v d=$((TICKS - PREV_TICKS)) -v hz="$HZ" -v dt="$DT" 'BEGIN{printf "%.2f", (d/hz)/dt*100}')
    fi
  fi
  PREV_TICKS="$TICKS"
  PREV_TS="$NOW_TS"
  echo "$(date -Is),$RSS,$CPU,$THREADS" >> "$OUT"
  sleep 2
done
