#!/usr/bin/env bash
# 仅替换 dist（机上已有可用的 better-sqlite3 node_modules），切到 Node
set -eo pipefail
export PATH=/opt/node-v21/bin:/usr/local/bin:$PATH

TAR_PATH=/tmp/nongyu-track-dist.tgz
test -f "$TAR_PATH"
test -d /opt/nongyu-track/node_modules/better-sqlite3

echo "=== update dist only ==="
rm -rf /opt/nongyu-track/dist.next
mkdir -p /opt/nongyu-track/dist.next
tar -xzf "$TAR_PATH" -C /opt/nongyu-track/dist.next
test -f /opt/nongyu-track/dist.next/index.js
# 确认不再依赖 workspace 包名
if grep -E 'from ["'\'']nongyu-track-contract["'\'']' /opt/nongyu-track/dist.next/index.js; then
  echo "dist still imports nongyu-track-contract" >&2
  exit 1
fi
rm -rf /opt/nongyu-track/dist
mv /opt/nongyu-track/dist.next /opt/nongyu-track/dist

cat >/etc/systemd/system/nongyu-track.service <<'EOF'
[Unit]
Description=Nongyu Track Server (Node)
After=network.target

[Service]
Type=simple
User=nongyu-track
Group=nongyu-track
EnvironmentFile=/etc/nongyu-track.env
WorkingDirectory=/opt/nongyu-track
ExecStart=/usr/local/bin/node /opt/nongyu-track/dist/index.js
Restart=always
RestartSec=3
MemoryMax=512M
LimitNOFILE=65535
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

chown -R nongyu-track:nongyu-track /opt/nongyu-track
systemctl daemon-reload
systemctl restart nongyu-track
sleep 2
systemctl is-active nongyu-track
curl -sf http://127.0.0.1:8081/health
echo
MAIN_PID=$(systemctl show nongyu-track -p MainPID --value)
ps -p "$MAIN_PID" -o pid=,user=,rss=,%cpu=,args=
echo "CUTOVER_OK"
rm -f "$TAR_PATH"
