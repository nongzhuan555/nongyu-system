-- nongyu-node-server initial schema (tables only; database selected by connection)
-- charset: utf8mb4 / engine: InnoDB
-- time columns: DATETIME(3), application uses UTC

CREATE TABLE IF NOT EXISTS schema_migrations (
  id INT NOT NULL AUTO_INCREMENT,
  filename VARCHAR(255) NOT NULL,
  applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_schema_migrations_filename (filename)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT NOT NULL AUTO_INCREMENT,
  student_no CHAR(9) NOT NULL COMMENT '学号，9位数字',
  name VARCHAR(64) NOT NULL,
  major VARCHAR(128) NULL,
  college VARCHAR(128) NULL,
  class_name VARCHAR(128) NULL,
  grade VARCHAR(32) NULL,
  gender TINYINT NOT NULL DEFAULT 0 COMMENT '0未知 1男 2女',
  hometown VARCHAR(64) NULL,
  campus VARCHAR(64) NULL,
  qq VARCHAR(20) NULL,
  role TINYINT NOT NULL DEFAULT 0 COMMENT '0用户 1管理员',
  admin_password_hash VARCHAR(255) NULL,
  status TINYINT NOT NULL DEFAULT 1 COMMENT '1正常 0禁用',
  is_online TINYINT(1) NOT NULL DEFAULT 0,
  last_active_at DATETIME(3) NULL,
  last_login_at DATETIME(3) NULL,
  device_brand VARCHAR(64) NULL,
  device_model VARCHAR(128) NULL,
  device_os VARCHAR(64) NULL,
  current_device_id VARCHAR(128) NULL,
  token_version INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_student_no (student_no),
  KEY idx_users_role_status (role, status),
  KEY idx_users_created_at (created_at),
  KEY idx_users_is_online (is_online),
  KEY idx_users_college (college),
  KEY idx_users_grade (grade),
  KEY idx_users_campus (campus),
  KEY idx_users_gender (gender),
  KEY idx_users_device_brand (device_brand),
  KEY idx_users_last_active_at (last_active_at),
  CONSTRAINT chk_users_student_no CHECK (student_no REGEXP '^[0-9]{9}$'),
  CONSTRAINT chk_users_gender CHECK (gender IN (0, 1, 2)),
  CONSTRAINT chk_users_role CHECK (role IN (0, 1)),
  CONSTRAINT chk_users_status CHECK (status IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_settings (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  theme VARCHAR(32) NOT NULL DEFAULT 'sicau_green',
  home_is_timetable TINYINT(1) NOT NULL DEFAULT 0,
  open_web_in_app TINYINT(1) NOT NULL DEFAULT 1,
  agent_enabled TINYINT(1) NOT NULL DEFAULT 1,
  highlight_today_column TINYINT(1) NOT NULL DEFAULT 1,
  course_card_color_mode VARCHAR(16) NOT NULL DEFAULT 'distinct',
  course_card_unified_color VARCHAR(32) NULL,
  semester_start_date DATE NULL,
  timetable_bg_uri VARCHAR(512) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_settings_user_id (user_id),
  KEY idx_user_settings_theme (theme),
  KEY idx_user_settings_home_is_timetable (home_is_timetable),
  KEY idx_user_settings_open_web_in_app (open_web_in_app),
  CONSTRAINT fk_user_settings_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_user_settings_theme CHECK (
    theme IN ('sicau_green', 'sakura_pink', 'dark', 'system')
  ),
  CONSTRAINT chk_user_settings_color_mode CHECK (
    course_card_color_mode IN ('distinct', 'unified')
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS posts (
  id BIGINT NOT NULL AUTO_INCREMENT,
  post_type VARCHAR(32) NOT NULL,
  subtype VARCHAR(32) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content MEDIUMTEXT NOT NULL,
  author_user_id BIGINT NOT NULL,
  view_count INT NOT NULL DEFAULT 0,
  unique_reader_count INT NOT NULL DEFAULT 0,
  deleted_at DATETIME(3) NULL,
  published_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_posts_type_published (post_type, published_at),
  KEY idx_posts_author_published (author_user_id, published_at),
  KEY idx_posts_deleted_published (deleted_at, published_at),
  CONSTRAINT fk_posts_author FOREIGN KEY (author_user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT chk_posts_type CHECK (post_type IN ('announcement', 'feedback', 'courtyard')),
  CONSTRAINT chk_posts_view_count CHECK (view_count >= 0),
  CONSTRAINT chk_posts_unique_reader_count CHECK (unique_reader_count >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS post_reads (
  id BIGINT NOT NULL AUTO_INCREMENT,
  post_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  first_read_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_post_reads_post_user (post_id, user_id),
  KEY idx_post_reads_user (user_id),
  CONSTRAINT fk_post_reads_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  CONSTRAINT fk_post_reads_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_versions (
  id BIGINT NOT NULL AUTO_INCREMENT,
  platform VARCHAR(16) NOT NULL,
  version_name VARCHAR(32) NOT NULL,
  version_code INT NOT NULL,
  release_channel VARCHAR(16) NOT NULL,
  force_update TINYINT(1) NOT NULL DEFAULT 0,
  download_url VARCHAR(512) NULL,
  changelog TEXT NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  published_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_app_versions_platform_code (platform, version_code),
  KEY idx_app_versions_published (platform, is_published, version_code),
  CONSTRAINT chk_app_versions_platform CHECK (platform IN ('ios', 'android', 'all')),
  CONSTRAINT chk_app_versions_channel CHECK (release_channel IN ('silent_ota', 'native'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
