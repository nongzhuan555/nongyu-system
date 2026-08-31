#!/usr/bin/env bash
set -euo pipefail
export PATH=/opt/node-v21/bin:/usr/local/bin:$PATH

echo "=== node symlinks ==="
ln -sfn /opt/node-v21/bin/node /usr/local/bin/node
ln -sfn /opt/node-v21/bin/npm /usr/local/bin/npm
ln -sfn /opt/node-v21/bin/npx /usr/local/bin/npx
node -v
npm -v

echo "=== dirs ==="
mkdir -p /opt/nongyu-track /var/backups/nongyu-track
id nongyu-track

echo "=== cold backup ==="
STAMP=$(date +%Y%m%d-%H%M%S)
sqlite3 /var/lib/nongyu-track/track.db ".backup '/var/backups/nongyu-track/track.db.pre-node-cutover-${STAMP}'"
ls -lah "/var/backups/nongyu-track/track.db.pre-node-cutover-${STAMP}"
echo "BACKUP_STAMP=${STAMP}"

systemctl is-active nongyu-track
curl -sf http://127.0.0.1:8081/health
echo
