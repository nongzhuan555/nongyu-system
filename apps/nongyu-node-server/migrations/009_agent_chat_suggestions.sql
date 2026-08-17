-- Agent chat empty-state suggestion chips (operable)

CREATE TABLE IF NOT EXISTS agent_chat_suggestions (
  id BIGINT NOT NULL AUTO_INCREMENT,
  text VARCHAR(24) NOT NULL,
  enabled TINYINT NOT NULL DEFAULT 0 COMMENT '1 enabled 0 disabled; multiple may be enabled',
  sort_order INT NOT NULL DEFAULT 0 COMMENT 'ascending; tie-break by id',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_agent_chat_suggestions_enabled_sort (enabled, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO agent_chat_suggestions (text, enabled, sort_order)
SELECT v.text, 1, v.sort_order
FROM (
  SELECT '查一下我的成绩' AS text, 1 AS sort_order
  UNION ALL SELECT '本周有哪些二课活动', 2
  UNION ALL SELECT '看看我的课表', 3
  UNION ALL SELECT '帮我改成深色主题', 4
) AS v
WHERE NOT EXISTS (SELECT 1 FROM agent_chat_suggestions LIMIT 1);
