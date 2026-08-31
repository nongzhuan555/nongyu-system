#!/usr/bin/env bash
set -euo pipefail
export PATH=/opt/node-v21/bin:/usr/local/bin:$PATH

echo "=== install g++ ==="
yum install -y gcc-c++ make python3
g++ --version | head -1

REMOTE_DIR=/opt/nongyu-track
TAR_PATH=/tmp/nongyu-track-dist.tgz
PKG_PATH=/tmp/nongyu-track-package.json

# 产物可能已被上次脚本删掉；若缺则失败提示重传
if [ ! -f "$TAR_PATH" ] || [ ! -f "$PKG_PATH" ]; then
  echo "MISSING_ARTIFACTS need re-upload tgz+package.json" >&2
  # 若 dist 已解压仍可继续 npm install
  if [ ! -f "$REMOTE_DIR/dist/index.js" ]; then
    exit 2
  fi
  if [ ! -f "$REMOTE_DIR/package.json" ]; then
    exit 2
  fi
else
  mkdir -p "$REMOTE_DIR"
  rm -rf "$REMOTE_DIR/dist.next"
  mkdir -p "$REMOTE_DIR/dist.next"
  tar -xzf "$TAR_PATH" -C "$REMOTE_DIR/dist.next"
  test -f "$REMOTE_DIR/dist.next/index.js"
  rm -rf "$REMOTE_DIR/dist"
  mv "$REMOTE_DIR/dist.next" "$REMOTE_DIR/dist"
  cp -a "$PKG_PATH" "$REMOTE_DIR/package.json"
fi

echo "=== npm install ==="
rm -rf "$REMOTE_DIR/node_modules"
(cd "$REMOTE_DIR" && npm install --omit=dev)
test -d "$REMOTE_DIR/node_modules/better-sqlite3"
test -f "$REMOTE_DIR/node_modules/better-sqlite3/build/Release/better_sqlite3.node" || \
  test -f "$REMOTE_DIR/node_modules/better-sqlite3/build/better_sqlite3.node" || \
  ls "$REMOTE_DIR/node_modules/better-sqlite3/build/Release/" || true

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
chown -R nongyu-track:nongyu-track /var/lib/nongyu-track

systemctl daemon-reload
systemctl start nongyu-track
sleep 2
systemctl is-active nongyu-track
curl -sf http://127.0.0.1:8081/health
echo
MAIN_PID=$(systemctl show nongyu-track -p MainPID --value)
tr '\0' ' ' < /proc/"$MAIN_PID"/cmdline; echo
ps -p "$MAIN_PID" -o pid=,user=,rss=,%cpu=,cmd=
echo "CUTOVER_OK"
rm -f "$TAR_PATH" "$PKG_PATH" 2>/dev/null || true
