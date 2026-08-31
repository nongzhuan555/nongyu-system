#!/bin/bash
set -euo pipefail
pkill -f /opt/nongyu-track-node-poc/poc-server 2>/dev/null || true
rm -rf /opt/nongyu-track-node-poc
rm -f /usr/local/bin/nongyu-track-bench
rm -rf /opt/track-migration-bench
rm -rf /opt/node-v22
rm -f /tmp/node.tar.xz /tmp/check-data.sh /tmp/cleanup-bench.sh
systemctl is-active nongyu-track
curl -sS -m 3 http://127.0.0.1:8081/health
echo
du -sh /var/lib/nongyu-track
echo "opt_listing:"
ls /opt 2>/dev/null || true
echo CLEAN_DONE
