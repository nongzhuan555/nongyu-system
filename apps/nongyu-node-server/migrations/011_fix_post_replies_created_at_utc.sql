-- 历史纠偏：post_replies.created_at / updated_at 曾依赖 DEFAULT CURRENT_TIMESTAMP(3)，
-- 在 MySQL 系统时区为东八区时写入的是「上海墙钟」，而应用层按 UTC 解读 → App 回显 +8h。
-- 仅当检测到系统/全局为东八区时回拨；UTC 环境跳过，避免误伤。

UPDATE post_replies
SET
  created_at = CONVERT_TZ(created_at, '+08:00', '+00:00'),
  updated_at = CONVERT_TZ(updated_at, '+08:00', '+00:00')
WHERE
  LOWER(@@system_time_zone) IN ('cst', 'china standard time')
  OR @@global.time_zone IN ('+08:00', 'Asia/Shanghai', 'Asia/Chongqing');
