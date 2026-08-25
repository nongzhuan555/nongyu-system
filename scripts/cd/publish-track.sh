#!/usr/bin/env bash
# Track 安全发布：备份当前二进制，install 新文件后重启；/health 失败则回滚。
# 不覆盖 SQLite、不改 /etc/nongyu-track.env。
# 用法：publish-track.sh <远端二进制路径> <systemd 单元> <健康检查 URL> <新二进制临时路径>
set -eu

REMOTE_BIN="${1:?missing remote bin}"
UNIT="${2:?missing systemd unit}"
HEALTH_URL="${3:?missing health url}"
NEW_BIN="${4:?missing new bin}"

test -f "${NEW_BIN}"
chmod 755 "${NEW_BIN}"

PREV_BIN="${REMOTE_BIN}.prev"
if [ -f "${REMOTE_BIN}" ]; then
  cp -a "${REMOTE_BIN}" "${PREV_BIN}"
fi

install -m 755 "${NEW_BIN}" "${REMOTE_BIN}"
rm -f "${NEW_BIN}"

systemctl restart "${UNIT}"
systemctl is-active "${UNIT}"

ok=0
i=0
while [ "${i}" -lt 15 ]; do
  if curl -sf "${HEALTH_URL}" >/dev/null; then
    ok=1
    break
  fi
  i=$((i + 1))
  sleep 2
done

if [ "${ok}" -ne 1 ]; then
  if [ -f "${PREV_BIN}" ]; then
    install -m 755 "${PREV_BIN}" "${REMOTE_BIN}"
    systemctl restart "${UNIT}"
  fi
  echo "health check failed; rolled back" >&2
  exit 1
fi

rm -f "${PREV_BIN}"
curl -sf "${HEALTH_URL}" | cat
