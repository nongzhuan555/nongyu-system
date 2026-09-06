-- 用户累计活跃天数（业务日起算，不做历史回填）

ALTER TABLE users
  ADD COLUMN active_days INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '累计活跃天数（上线后向前累计）' AFTER last_active_at,
  ADD COLUMN active_day_bucket DATE NULL COMMENT '最近一次已计入的业务日 YYYY-MM-DD' AFTER active_days,
  ADD KEY idx_users_active_days (active_days);
