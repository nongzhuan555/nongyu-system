-- 广场回复与留言：统一承载「反馈墙管理员回复」与「大院用户留言」
-- kind 区分两种语义，与 posts.post_type 设计风格一致
-- 时间列：DATETIME(3)，应用层使用 UTC

CREATE TABLE IF NOT EXISTS post_replies (
  id BIGINT NOT NULL AUTO_INCREMENT,
  post_id BIGINT NOT NULL,
  kind VARCHAR(16) NOT NULL COMMENT 'admin_reply=反馈墙管理员回复；comment=大院用户留言',
  author_user_id BIGINT NOT NULL COMMENT '留言者 / 回复管理员（管理端实名用）',
  content MEDIUMTEXT NOT NULL,
  notified_author TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已通知帖子作者（0=待通知）',
  deleted_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_replies_post_kind_created (post_id, kind, created_at),
  KEY idx_replies_author_created (author_user_id, created_at),
  KEY idx_replies_notified (notified_author, post_id),
  CONSTRAINT fk_replies_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  CONSTRAINT fk_replies_author FOREIGN KEY (author_user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT chk_replies_kind CHECK (kind IN ('admin_reply', 'comment'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
