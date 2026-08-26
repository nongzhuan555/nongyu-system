-- role=2 超级管理员；埋点采样率单行配置

ALTER TABLE users DROP CHECK chk_users_role;
ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN (0, 1, 2));
ALTER TABLE users MODIFY COLUMN role TINYINT NOT NULL DEFAULT 0 COMMENT '0用户 1管理员 2超级管理员';

CREATE TABLE IF NOT EXISTS app_runtime_config (
  id TINYINT NOT NULL COMMENT '单行哨兵，固定为 1',
  track_sample_rate TINYINT NOT NULL DEFAULT 100 COMMENT '埋点采样率百分比 0-100',
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  updated_by BIGINT NULL COMMENT '操作者 users.id',
  PRIMARY KEY (id),
  CONSTRAINT chk_app_runtime_config_id CHECK (id = 1),
  CONSTRAINT chk_app_runtime_config_sample_rate CHECK (track_sample_rate BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO app_runtime_config (id, track_sample_rate, updated_at)
VALUES (1, 100, UTC_TIMESTAMP(3));
