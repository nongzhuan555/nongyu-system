#!/usr/bin/env bash
# 静态站安全发布：先解压到旁路目录，确认 index.html 后再切入直播目录，最后 nginx reload。
# 用法：publish-static.sh <直播目录> <tar.gz 路径>
set -eu

LIVE_DIR="${1:?missing live dir}"
TAR_PATH="${2:?missing tar path}"
STAGING="${LIVE_DIR}.next"

test -f "${TAR_PATH}"

rm -rf "${STAGING}"
mkdir -p "${STAGING}"
tar -xzf "${TAR_PATH}" -C "${STAGING}"
test -f "${STAGING}/index.html"

mkdir -p "${LIVE_DIR}"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete "${STAGING}/" "${LIVE_DIR}/"
  rm -rf "${STAGING}"
else
  BACKUP="${LIVE_DIR}.prev"
  rm -rf "${BACKUP}"
  mv "${LIVE_DIR}" "${BACKUP}"
  mv "${STAGING}" "${LIVE_DIR}"
  rm -rf "${BACKUP}"
fi

rm -f "${TAR_PATH}"

nginx -t
systemctl reload nginx
