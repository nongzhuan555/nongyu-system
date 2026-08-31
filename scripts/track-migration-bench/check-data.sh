#!/bin/bash
set -e
echo "GO_LOADTEST_ROWS=$(sqlite3 /var/lib/nongyu-track/track.db "SELECT COUNT(*) FROM events WHERE student_no LIKE 'loadtest_%';")"
echo "GO_TOTAL_ROWS=$(sqlite3 /var/lib/nongyu-track/track.db "SELECT COUNT(*) FROM events;")"
du -sh /var/lib/nongyu-track
if [ -f /opt/nongyu-track-node-poc/poc-track.db ]; then
  echo "POC_ROWS=$(sqlite3 /opt/nongyu-track-node-poc/poc-track.db "SELECT COUNT(*) FROM events;")"
  du -sh /opt/nongyu-track-node-poc
else
  echo "POC_DB=missing"
fi
pgrep -af poc-server.mjs || echo "POC_PROC=stopped"
