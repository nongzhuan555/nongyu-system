-- 课表扩展 tombstone：跨设备删除传播
-- charset: utf8mb4 / engine: InnoDB / time: DATETIME(3) UTC

CREATE TABLE IF NOT EXISTS course_ext_tombstones (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  entity VARCHAR(16) NOT NULL,
  entity_id CHAR(36) NOT NULL,
  deleted_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_tombstones_user_entity (user_id, entity, entity_id),
  KEY idx_tombstones_user_deleted (user_id, deleted_at),
  CONSTRAINT fk_tombstones_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_tombstones_entity CHECK (entity IN ('schedule', 'note', 'todo'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
