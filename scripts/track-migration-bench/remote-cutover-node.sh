#!/usr/bin/env bash
# 将 Track 从 Go 切到已上传的 Node 产物（/tmp/nongyu-track-dist.tgz + package.json）
set -euo pipefail
export PATH=/opt/node-v21/bin:/usr/local/bin:$PATH

REMOTE_DIR=/opt/nongyu-track
UNIT=nongyu-track.service
HEALTH_URL=http://127.0.0.1:8081/health
TAR_PATH=/tmp/nongyu-track-dist.tgz
PKG_PATH=/tmp/nongyu-track-package.json

test -f "$TAR_PATH"
test -f "$PKG_PATH"

echo "=== stop Go track ==="
systemctl stop nongyu-track || true

echo "=== install Node app ==="
mkdir -p "$REMOTE_DIR"
rm -rf "$REMOTE_DIR/dist.next"
mkdir -p "$REMOTE_DIR/dist.next"
tar -xzf "$TAR_PATH" -C "$REMOTE_DIR/dist.next"
test -f "$REMOTE_DIR/dist.next/index.js"
rm -rf "$REMOTE_DIR/dist"
mv "$REMOTE_DIR/dist.next" "$REMOTE_DIR/dist"
cp -a "$PKG_PATH" "$REMOTE_DIR/package.json"
(cd "$REMOTE_DIR" && npm install --omit=dev)
test -d "$REMOTE_DIR/node_modules/better-sqlite3"

echo "=== write systemd unit (Node) ==="
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
# 数据目录仍属 nongyu-track
chown -R nongyu-track:nongyu-track /var/lib/nongyu-track

systemctl daemon-reload
systemctl start nongyu-track
systemctl is-active nongyu-track

ok=0
i=0
while [ "$i" -lt 20 ]; do
  if curl -sf "$HEALTH_URL" >/dev/null; then
    ok=1
    break
  fi
  i=$((i + 1))
  sleep 1
done
if [ "$ok" -ne 1 ]; then
  echo "health failed" >&2
  journalctl -u nongyu-track -n 80 --no-pager >&2 || true
  exit 1
fi

curl -sf "$HEALTH_URL"
echo
MAIN_PID=$(systemctl show nongyu-track -p MainPID --value)
tr '\0' ' ' < /proc/"$MAIN_PID"/cmdline; echo
ps -p "$MAIN_PID" -o pid=,user=,rss=,%cpu=,cmd=
echo "CUTOVER_OK"
rm -f "$TAR_PATH" "$PKG_PATH"
