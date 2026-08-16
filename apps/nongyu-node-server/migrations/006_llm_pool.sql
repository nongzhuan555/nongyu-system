-- LLM key pool + daily usage (platform LLM proxy)

CREATE TABLE IF NOT EXISTS llm_api_keys (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL,
  provider VARCHAR(32) NOT NULL DEFAULT 'zhipu',
  account_group VARCHAR(64) NOT NULL,
  api_key_cipher TEXT NOT NULL,
  api_key_suffix CHAR(4) NOT NULL,
  base_url VARCHAR(255) NULL,
  model VARCHAR(64) NULL,
  max_concurrent INT NOT NULL DEFAULT 1,
  weight INT NOT NULL DEFAULT 1,
  status TINYINT NOT NULL DEFAULT 1 COMMENT '1 enabled 0 disabled',
  success_count BIGINT NOT NULL DEFAULT 0,
  fail_count BIGINT NOT NULL DEFAULT 0,
  last_used_at DATETIME(3) NULL,
  last_error VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_llm_api_keys_provider_status (provider, status),
  KEY idx_llm_api_keys_account_group_status (account_group, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS llm_user_usage_daily (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  usage_date DATE NOT NULL,
  request_count INT NOT NULL DEFAULT 0,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_llm_user_usage_daily (user_id, usage_date),
  KEY idx_llm_user_usage_daily_date (usage_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
