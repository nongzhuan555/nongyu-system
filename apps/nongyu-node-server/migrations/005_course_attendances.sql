-- 课表考勤 + tombstone entity 扩展 attendance
-- charset: utf8mb4 / engine: InnoDB / time: DATETIME(3) UTC

CREATE TABLE IF NOT EXISTS course_attendances (
  id CHAR(36) NOT NULL,
  user_id BIGINT NOT NULL,
  course_id VARCHAR(128) NOT NULL,
  week INT NOT NULL,
  day TINYINT NOT NULL,
  status VARCHAR(16) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_att_user_course_week_day (user_id, course_id, week, day),
  KEY idx_att_user (user_id),
  CONSTRAINT fk_att_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_att_day CHECK (day BETWEEN 1 AND 7),
  CONSTRAINT chk_att_status CHECK (status IN ('present', 'late', 'absent', 'leave'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 允许 tombstone.entity = attendance（MySQL 8：先 DROP 再 ADD CHECK）
ALTER TABLE course_ext_tombstones DROP CHECK chk_tombstones_entity;
ALTER TABLE course_ext_tombstones
  ADD CONSTRAINT chk_tombstones_entity
  CHECK (entity IN ('schedule', 'note', 'todo', 'attendance'));
