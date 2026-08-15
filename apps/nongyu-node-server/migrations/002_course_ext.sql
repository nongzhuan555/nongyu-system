-- 课表扩展：自定义日程 / 课程备注 / 课程待办
-- charset: utf8mb4 / engine: InnoDB / time: DATETIME(3) UTC

CREATE TABLE IF NOT EXISTS custom_schedules (
  id CHAR(36) NOT NULL,
  user_id BIGINT NOT NULL,
  title VARCHAR(128) NOT NULL,
  content VARCHAR(1024) NOT NULL DEFAULT '',
  location VARCHAR(128) NOT NULL DEFAULT '',
  day TINYINT NOT NULL,
  start_period INT NOT NULL,
  end_period INT NOT NULL,
  weeks_list TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_schedules_user (user_id),
  CONSTRAINT fk_schedules_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_schedules_day CHECK (day BETWEEN 1 AND 7)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_notes (
  id CHAR(36) NOT NULL,
  user_id BIGINT NOT NULL,
  course_id VARCHAR(128) NOT NULL,
  content VARCHAR(2048) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_notes_user_course (user_id, course_id),
  CONSTRAINT fk_notes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_todos (
  id CHAR(36) NOT NULL,
  user_id BIGINT NOT NULL,
  course_id VARCHAR(128) NOT NULL,
  content VARCHAR(1024) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  due_date VARCHAR(32) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  completed_at DATETIME(3) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_todos_user_course (user_id, course_id),
  CONSTRAINT fk_todos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_todos_status CHECK (status IN ('pending', 'done'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
