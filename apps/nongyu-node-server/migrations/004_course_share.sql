-- 课表共享快照：opt-in 原始 CourseEntry[] JSON
-- charset: utf8mb4 / engine: InnoDB / time: DATETIME(3) UTC

CREATE TABLE IF NOT EXISTS course_share_snapshots (
  user_id BIGINT NOT NULL,
  student_no CHAR(9) NOT NULL COMMENT '学号，查找键',
  share_enabled TINYINT(1) NOT NULL DEFAULT 0,
  courses_json JSON NULL COMMENT '开启时为 CourseEntry[]；关闭为 NULL',
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id),
  UNIQUE KEY uk_course_share_student_no (student_no),
  CONSTRAINT fk_course_share_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_course_share_student_no CHECK (student_no REGEXP '^[0-9]{9}$'),
  CONSTRAINT chk_course_share_enabled CHECK (share_enabled IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
