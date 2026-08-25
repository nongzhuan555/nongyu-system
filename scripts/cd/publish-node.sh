#!/usr/bin/env bash
# Node 安全发布：备份 dist 与 package.json，覆盖后再 npm install，成功才 systemd 重启；
# /health 失败则回滚文件并再次重启。不 migrate、不改 .env。
# 用法：publish-node.sh <应用目录> <systemd 单元> <健康检查 URL> <dist tar> <package.json>
set -eu

REMOTE_DIR="${1:?missing remote dir}"
UNIT="${2:?missing systemd unit}"
HEALTH_URL="${3:?missing health url}"
TAR_PATH="${4:?missing dist tar}"
PKG_PATH="${5:?missing package.json}"

test -f "${TAR_PATH}"
test -f "${PKG_PATH}"
test -d "${REMOTE_DIR}"

DIST_DIR="${REMOTE_DIR}/dist"
DIST_NEXT="${REMOTE_DIR}/dist.next"
DIST_PREV="${REMOTE_DIR}/dist.prev"
PKG_LIVE="${REMOTE_DIR}/package.json"
PKG_PREV="${REMOTE_DIR}/package.json.prev"

rm -rf "${DIST_NEXT}"
mkdir -p "${DIST_NEXT}"
tar -xzf "${TAR_PATH}" -C "${DIST_NEXT}"
test -f "${DIST_NEXT}/index.js"

if [ -d "${DIST_DIR}" ]; then
  rm -rf "${DIST_PREV}"
  cp -a "${DIST_DIR}" "${DIST_PREV}"
fi
if [ -f "${PKG_LIVE}" ]; then
  cp -a "${PKG_LIVE}" "${PKG_PREV}"
fi

rm -rf "${DIST_DIR}"
mv "${DIST_NEXT}" "${DIST_DIR}"
cp -a "${PKG_PATH}" "${PKG_LIVE}"
rm -f "${TAR_PATH}" "${PKG_PATH}"

rollback_files() {
  if [ -d "${DIST_PREV}" ]; then
    rm -rf "${DIST_DIR}"
    mv "${DIST_PREV}" "${DIST_DIR}"
  fi
  if [ -f "${PKG_PREV}" ]; then
    cp -a "${PKG_PREV}" "${PKG_LIVE}"
  fi
}

if ! (cd "${REMOTE_DIR}" && npm install --omit=dev); then
  rollback_files
  exit 1
fi

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
  rollback_files
  systemctl restart "${UNIT}"
  echo "health check failed; rolled back" >&2
  exit 1
fi

rm -rf "${DIST_PREV}"
rm -f "${PKG_PREV}"
curl -sf "${HEALTH_URL}" | cat
