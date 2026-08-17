-- Home greeting messages (operable second line on App home)

CREATE TABLE IF NOT EXISTS home_greetings (
  id BIGINT NOT NULL AUTO_INCREMENT,
  message VARCHAR(48) NOT NULL,
  enabled TINYINT NOT NULL DEFAULT 0 COMMENT '1 enabled 0 disabled; at most one enabled',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_home_greetings_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO home_greetings (message, enabled)
SELECT '祝你今天学习顺利', 1
WHERE NOT EXISTS (SELECT 1 FROM home_greetings LIMIT 1);
