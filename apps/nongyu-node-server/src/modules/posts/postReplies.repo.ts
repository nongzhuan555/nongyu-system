import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getPool } from "../../lib/db.js";

export type ReplyKind = "admin_reply" | "comment";

export type PostReplyRow = {
  id: number;
  post_id: number;
  kind: ReplyKind;
  author_user_id: number;
  content: string;
  notified_author: number;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
  author_student_no?: string;
  author_name?: string;
};

/** 轮询新回复时联合 posts 的简化行 */
export type NewReplyRow = {
  replyId: number;
  postId: number;
  postType: "announcement" | "feedback" | "courtyard";
  postTitle: string;
  kind: ReplyKind;
  content: string;
  createdAt: Date;
};

type Db = PoolConnection | ReturnType<typeof getPool>;

/** 反馈墙：取该帖未软删的管理员单条回复（含作者实名，供 Admin；App 由路由层裁剪） */
export async function getAdminReplyForPost(
  postId: number,
  conn?: PoolConnection,
): Promise<PostReplyRow | null> {
  const db: Db = conn ?? getPool();
  const [rows] = await db.query<(PostReplyRow & RowDataPacket)[]>(
    `SELECT r.*, u.student_no AS author_student_no, u.name AS author_name
     FROM post_replies r
     JOIN users u ON u.id = r.author_user_id
     WHERE r.post_id = ? AND r.kind = 'admin_reply' AND r.deleted_at IS NULL
     LIMIT 1`,
    [postId],
  );
  return rows[0] ?? null;
}

/** 大院：列该帖未软删的顶层留言（含作者实名，供 Admin；App 由路由层裁剪 isMine） */
export async function listCommentsForPost(
  postId: number,
  conn?: PoolConnection,
): Promise<PostReplyRow[]> {
  const db: Db = conn ?? getPool();
  const [rows] = await db.query<(PostReplyRow & RowDataPacket)[]>(
    `SELECT r.*, u.student_no AS author_student_no, u.name AS author_name
     FROM post_replies r
     JOIN users u ON u.id = r.author_user_id
     WHERE r.post_id = ? AND r.kind = 'comment' AND r.deleted_at IS NULL
     ORDER BY r.created_at ASC`,
    [postId],
  );
  return rows;
}

/** 列表角标：批量统计多个帖子的未软删回复总数（含 admin_reply 与 comment） */
export async function countRepliesForPosts(postIds: number[]): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  if (!postIds.length) return result;
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT post_id, COUNT(*) AS c
     FROM post_replies
     WHERE deleted_at IS NULL AND post_id IN (${postIds.map(() => "?").join(",")})
     GROUP BY post_id`,
    postIds,
  );
  for (const row of rows) {
    result.set(Number(row.post_id), Number(row.c));
  }
  return result;
}

/**
 * 反馈墙：创建管理员单条回复。
 * 必须在事务内调用：先锁帖（posts FOR UPDATE）再锁/查 reply，避免空结果无 gap lock 时并发双插。
 * 已存在未软删回复时抛 ReplyAlreadyExistsError（由调用方转 409）。
 * 帖不存在/已软删时抛 PostGoneError（由调用方转 404）。
 */
export async function createAdminReply(
  conn: PoolConnection,
  postId: number,
  adminUserId: number,
  content: string,
): Promise<{ id: number; publishedAt: Date }> {
  const [posts] = await conn.query<RowDataPacket[]>(
    `SELECT id, post_type, deleted_at FROM posts WHERE id = ? FOR UPDATE`,
    [postId],
  );
  if (!posts.length || posts[0].deleted_at) {
    throw new PostGoneError();
  }
  if (posts[0].post_type !== "feedback") {
    throw new PostTypeNotAllowedError("feedback");
  }

  const [existing] = await conn.query<RowDataPacket[]>(
    `SELECT id FROM post_replies
     WHERE post_id = ? AND kind = 'admin_reply' AND deleted_at IS NULL
     FOR UPDATE`,
    [postId],
  );
  if (existing.length) {
    throw new ReplyAlreadyExistsError();
  }
  const [result] = await conn.query<ResultSetHeader>(
    `INSERT INTO post_replies
       (post_id, kind, author_user_id, content, notified_author, created_at, updated_at)
     VALUES (?, 'admin_reply', ?, ?, 0, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
    [postId, adminUserId, content],
  );
  const [row] = await conn.query<RowDataPacket[]>(
    `SELECT created_at FROM post_replies WHERE id = ? LIMIT 1`,
    [result.insertId],
  );
  return { id: Number(result.insertId), publishedAt: row[0].created_at as Date };
}

/** 反馈墙：更新该帖现有管理员回复。须在事务内调用；不存在抛 ReplyNotFoundError。 */
export async function updateAdminReply(
  conn: PoolConnection,
  postId: number,
  content: string,
): Promise<{ id: number; publishedAt: Date }> {
  const [existing] = await conn.query<RowDataPacket[]>(
    `SELECT id, created_at FROM post_replies
     WHERE post_id = ? AND kind = 'admin_reply' AND deleted_at IS NULL
     FOR UPDATE`,
    [postId],
  );
  if (!existing.length) {
    throw new ReplyNotFoundError();
  }
  const replyId = Number(existing[0].id);
  await conn.query(
    `UPDATE post_replies SET content = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ?`,
    [content, replyId],
  );
  return { id: replyId, publishedAt: existing[0].created_at as Date };
}

/** 反馈墙：软删该帖管理员回复。须在事务内调用；不存在抛 ReplyNotFoundError。 */
export async function softDeleteAdminReply(conn: PoolConnection, postId: number): Promise<void> {
  const [existing] = await conn.query<RowDataPacket[]>(
    `SELECT id FROM post_replies
     WHERE post_id = ? AND kind = 'admin_reply' AND deleted_at IS NULL
     FOR UPDATE`,
    [postId],
  );
  if (!existing.length) {
    throw new ReplyNotFoundError();
  }
  await conn.query(`UPDATE post_replies SET deleted_at = UTC_TIMESTAMP(3) WHERE id = ?`, [
    existing[0].id,
  ]);
}

/**
 * 大院：用户发表留言。须在事务内调用：先锁帖再 INSERT，避免向已软删帖写入存活留言。
 * notified_author=0 待通知帖子作者。
 */
export async function createComment(
  conn: PoolConnection,
  postId: number,
  userId: number,
  content: string,
): Promise<{ id: number; publishedAt: Date }> {
  const [posts] = await conn.query<RowDataPacket[]>(
    `SELECT id, post_type, deleted_at FROM posts WHERE id = ? FOR UPDATE`,
    [postId],
  );
  if (!posts.length || posts[0].deleted_at) {
    throw new PostGoneError();
  }
  if (posts[0].post_type !== "courtyard") {
    throw new PostTypeNotAllowedError("courtyard");
  }

  const [result] = await conn.query<ResultSetHeader>(
    `INSERT INTO post_replies
       (post_id, kind, author_user_id, content, notified_author, created_at, updated_at)
     VALUES (?, 'comment', ?, ?, 0, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
    [postId, userId, content],
  );
  const [row] = await conn.query<RowDataPacket[]>(
    `SELECT created_at FROM post_replies WHERE id = ? LIMIT 1`,
    [result.insertId],
  );
  return { id: Number(result.insertId), publishedAt: row[0].created_at as Date };
}

/** 大院：用户删自己的留言。须绑定 postId，防止跨帖误删。非本人或不存在返回 false。 */
export async function softDeleteCommentByOwner(
  postId: number,
  commentId: number,
  userId: number,
  conn?: PoolConnection,
): Promise<boolean> {
  const db: Db = conn ?? getPool();
  const [result] = await db.query<ResultSetHeader>(
    `UPDATE post_replies SET deleted_at = UTC_TIMESTAMP(3)
     WHERE id = ? AND post_id = ? AND kind = 'comment' AND author_user_id = ? AND deleted_at IS NULL`,
    [commentId, postId, userId],
  );
  return result.affectedRows > 0;
}

/** 大院：管理员删任意留言。须绑定 postId。不存在返回 false。 */
export async function softDeleteCommentByAdmin(
  postId: number,
  commentId: number,
  conn?: PoolConnection,
): Promise<boolean> {
  const db: Db = conn ?? getPool();
  const [result] = await db.query<ResultSetHeader>(
    `UPDATE post_replies SET deleted_at = UTC_TIMESTAMP(3)
     WHERE id = ? AND post_id = ? AND kind = 'comment' AND deleted_at IS NULL`,
    [commentId, postId],
  );
  return result.affectedRows > 0;
}

/** 删帖级联：软删该帖下所有回复 / 留言。须在删帖事务内调用。 */
export async function softDeleteRepliesOfPost(conn: PoolConnection, postId: number): Promise<void> {
  await conn.query(
    `UPDATE post_replies SET deleted_at = UTC_TIMESTAMP(3)
     WHERE post_id = ? AND deleted_at IS NULL`,
    [postId],
  );
}

/** 我的留言 / 收到的回复列表行（App 侧不带作者身份） */
export type MyPostReplyListRow = {
  replyId: number;
  postId: number;
  postType: "feedback" | "courtyard" | "announcement";
  postTitle: string;
  kind: ReplyKind;
  content: string;
  publishedAt: Date;
};

/**
 * 收到的回复 inbox：当前用户作为帖主，且回复作者不是自己；双方未软删。
 * 按回复时间倒序分页。
 */
export async function listReceivedRepliesForUser(params: {
  userId: number;
  offset: number;
  pageSize: number;
}): Promise<{ rows: MyPostReplyListRow[]; total: number }> {
  const pool = getPool();
  const where = `p.author_user_id = ?
    AND r.author_user_id <> ?
    AND r.deleted_at IS NULL AND p.deleted_at IS NULL
    AND r.kind IN ('admin_reply', 'comment')`;
  const args = [params.userId, params.userId];
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c
     FROM post_replies r
     JOIN posts p ON p.id = r.post_id
     WHERE ${where}`,
    args,
  );
  const [rows] = await pool.query<(MyPostReplyListRow & RowDataPacket)[]>(
    `SELECT r.id AS replyId, p.id AS postId, p.post_type AS postType, p.title AS postTitle,
            r.kind AS kind, r.content AS content, r.created_at AS publishedAt
     FROM post_replies r
     JOIN posts p ON p.id = r.post_id
     WHERE ${where}
     ORDER BY r.created_at DESC, r.id DESC
     LIMIT ? OFFSET ?`,
    [...args, params.pageSize, params.offset],
  );
  return { rows, total: Number(countRows[0]?.c ?? 0) };
}

/**
 * 我发出的留言：当前用户对他人大院帖的 comment；双方未软删。
 * 按留言时间倒序分页。
 */
export async function listSentCommentsForUser(params: {
  userId: number;
  offset: number;
  pageSize: number;
}): Promise<{ rows: MyPostReplyListRow[]; total: number }> {
  const pool = getPool();
  const where = `r.author_user_id = ?
    AND p.author_user_id <> ?
    AND r.kind = 'comment'
    AND p.post_type = 'courtyard'
    AND r.deleted_at IS NULL AND p.deleted_at IS NULL`;
  const args = [params.userId, params.userId];
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c
     FROM post_replies r
     JOIN posts p ON p.id = r.post_id
     WHERE ${where}`,
    args,
  );
  const [rows] = await pool.query<(MyPostReplyListRow & RowDataPacket)[]>(
    `SELECT r.id AS replyId, p.id AS postId, p.post_type AS postType, p.title AS postTitle,
            r.kind AS kind, r.content AS content, r.created_at AS publishedAt
     FROM post_replies r
     JOIN posts p ON p.id = r.post_id
     WHERE ${where}
     ORDER BY r.created_at DESC, r.id DESC
     LIMIT ? OFFSET ?`,
    [...args, params.pageSize, params.offset],
  );
  return { rows, total: Number(countRows[0]?.c ?? 0) };
}

/**
 * 轮询：取当前用户作为帖子作者的「未通知」回复，同事务内置位 notified_author=1。
 * 必须在事务内调用。单次最多 50 条；超过则下次轮询继续。
 */
export async function consumeNewRepliesForUser(
  conn: PoolConnection,
  userId: number,
): Promise<NewReplyRow[]> {
  // FOR UPDATE：串行化并发轮询，避免两条请求同时读到同一批未通知行导致重复 toast
  const [rows] = await conn.query<(NewReplyRow & RowDataPacket)[]>(
    `SELECT r.id AS replyId, p.id AS postId, p.post_type AS postType, p.title AS postTitle,
            r.kind AS kind, r.content AS content, r.created_at AS createdAt
     FROM post_replies r
     JOIN posts p ON p.id = r.post_id
     WHERE p.author_user_id = ? AND r.notified_author = 0
       AND r.deleted_at IS NULL AND p.deleted_at IS NULL
     ORDER BY r.created_at ASC
     LIMIT 50
     FOR UPDATE`,
    [userId],
  );
  if (!rows.length) return [];
  const ids = rows.map((r) => r.replyId);
  await conn.query(
    `UPDATE post_replies SET notified_author = 1
     WHERE notified_author = 0 AND id IN (${ids.map(() => "?").join(",")})`,
    ids,
  );
  return rows;
}

/** 业务错误：管理员回复已存在（409） */
export class ReplyAlreadyExistsError extends Error {
  constructor() {
    super("该帖已有管理员回复");
    this.name = "ReplyAlreadyExistsError";
  }
}

/** 业务错误：管理员回复不存在（404） */
export class ReplyNotFoundError extends Error {
  constructor() {
    super("管理员回复不存在");
    this.name = "ReplyNotFoundError";
  }
}

/** 业务错误：帖不存在或已软删（事务内锁帖后发现） */
export class PostGoneError extends Error {
  constructor() {
    super("帖子不存在");
    this.name = "PostGoneError";
  }
}

/** 业务错误：帖类型不允许该操作（事务内校验） */
export class PostTypeNotAllowedError extends Error {
  constructor(expected: "feedback" | "courtyard") {
    super(expected === "feedback" ? "仅反馈墙帖可回复" : "仅大院帖可留言");
    this.name = "PostTypeNotAllowedError";
  }
}
