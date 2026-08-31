#!/usr/bin/env bash
set -euo pipefail
export PATH=/opt/node-v21/bin:/usr/local/bin:$PATH

echo "=== 0) restore Go immediately if Node not ready ==="
# 先保证服务可用：临时指回 Go
cat >/etc/systemd/system/nongyu-track.service <<'EOF'
[Unit]
Description=nongyu-go-track-server
After=network.target

[Service]
Type=simple
User=nongyu-track
Group=nongyu-track
EnvironmentFile=/etc/nongyu-track.env
ExecStart=/usr/local/bin/nongyu-track
WorkingDirectory=/var/lib/nongyu-track
Restart=always
RestartSec=3
MemoryMax=512M
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl restart nongyu-track
sleep 1
curl -sf http://127.0.0.1:8081/health && echo " GO_RESTORED" || { echo "GO_RESTORE_FAILED"; journalctl -u nongyu-track -n 30 --no-pager; exit 1; }

echo "=== 1) install gcc-toolset-12 for C++20 ==="
yum install -y gcc-toolset-12-gcc gcc-toolset-12-gcc-c++ gcc-toolset-12-binutils
# shellcheck disable=SC1091
source /opt/rh/gcc-toolset-12/enable
g++ --version | head -1

REMOTE_DIR=/opt/nongyu-track
TAR_PATH=/tmp/nongyu-track-dist.tgz
PKG_PATH=/tmp/nongyu-track-package.json

test -f "$TAR_PATH"
test -f "$PKG_PATH"

echo "=== 2) unpack + npm install with toolset-12 ==="
mkdir -p "$REMOTE_DIR"
rm -rf "$REMOTE_DIR/dist.next" "$REMOTE_DIR/node_modules"
mkdir -p "$REMOTE_DIR/dist.next"
tar -xzf "$TAR_PATH" -C "$REMOTE_DIR/dist.next"
test -f "$REMOTE_DIR/dist.next/index.js"
rm -rf "$REMOTE_DIR/dist"
mv "$REMOTE_DIR/dist.next" "$REMOTE_DIR/dist"
cp -a "$PKG_PATH" "$REMOTE_DIR/package.json"
(cd "$REMOTE_DIR" && npm install --omit=dev)
test -f "$REMOTE_DIR/node_modules/better-sqlite3/build/Release/better_sqlite3.node"

echo "=== 3) cutover to Node ==="
systemctl stop nongyu-track
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
rm -f "$TAR_PATH" "$PKG_PATH"
