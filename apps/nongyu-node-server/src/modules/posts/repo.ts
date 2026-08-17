import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getPool, withTransaction, type PoolConnection } from "../../lib/db.js";
import { escapeLikePattern } from "../../lib/util.js";
import { softDeleteRepliesOfPost } from "./postReplies.repo.js";

export type PostRow = {
  id: number;
  post_type: "announcement" | "feedback" | "courtyard";
  subtype: string;
  title: string;
  content: string;
  author_user_id: number;
  view_count: number;
  unique_reader_count: number;
  deleted_at: Date | null;
  published_at: Date;
  created_at: Date;
  updated_at: Date;
  author_student_no?: string;
  author_name?: string;
};

export async function findPostById(id: number, conn?: PoolConnection): Promise<PostRow | null> {
  const db = conn ?? getPool();
  const [rows] = await db.query<(PostRow & RowDataPacket)[]>(
    `SELECT p.*, u.student_no AS author_student_no, u.name AS author_name
     FROM posts p
     JOIN users u ON u.id = p.author_user_id
     WHERE p.id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function listPosts(params: {
  postType?: string;
  postTypes?: string[];
  subtype?: string;
  /** 已 trim 的关键词；对 title/content 转义 LIKE */
  keyword?: string;
  authorUserId?: number;
  includeDeleted?: boolean;
  offset: number;
  pageSize: number;
}): Promise<{ rows: PostRow[]; total: number }> {
  const where: string[] = ["1=1"];
  const args: unknown[] = [];
  if (params.postType) {
    where.push("p.post_type = ?");
    args.push(params.postType);
  } else if (params.postTypes?.length) {
    where.push(`p.post_type IN (${params.postTypes.map(() => "?").join(",")})`);
    args.push(...params.postTypes);
  }
  if (params.subtype) {
    where.push("p.subtype = ?");
    args.push(params.subtype);
  }
  if (params.keyword) {
    const pattern = `%${escapeLikePattern(params.keyword)}%`;
    where.push("(p.title LIKE ? ESCAPE '\\\\' OR p.content LIKE ? ESCAPE '\\\\')");
    args.push(pattern, pattern);
  }
  if (params.authorUserId) {
    where.push("p.author_user_id = ?");
    args.push(params.authorUserId);
  }
  if (!params.includeDeleted) {
    where.push("p.deleted_at IS NULL");
  }
  const whereSql = where.join(" AND ");
  const pool = getPool();
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM posts p WHERE ${whereSql}`,
    args,
  );
  const [rows] = await pool.query<(PostRow & RowDataPacket)[]>(
    `SELECT p.*, u.student_no AS author_student_no, u.name AS author_name
     FROM posts p
     JOIN users u ON u.id = p.author_user_id
     WHERE ${whereSql}
     ORDER BY p.published_at DESC
     LIMIT ? OFFSET ?`,
    [...args, params.pageSize, params.offset],
  );
  return { rows, total: Number(countRows[0]?.c ?? 0) };
}

export async function latestAnnouncement(): Promise<PostRow | null> {
  const [rows] = await getPool().query<(PostRow & RowDataPacket)[]>(
    `SELECT * FROM posts
     WHERE post_type = 'announcement' AND deleted_at IS NULL
     ORDER BY published_at DESC LIMIT 1`,
  );
  return rows[0] ?? null;
}

export async function insertPost(
  input: {
    postType: string;
    subtype: string;
    title: string;
    content: string;
    authorUserId: number;
    publishedAt?: Date;
  },
  conn?: PoolConnection,
): Promise<number> {
  const db = conn ?? getPool();
  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO posts (post_type, subtype, title, content, author_user_id, published_at)
     VALUES (?, ?, ?, ?, ?, COALESCE(?, UTC_TIMESTAMP(3)))`,
    [
      input.postType,
      input.subtype,
      input.title,
      input.content,
      input.authorUserId,
      input.publishedAt ?? null,
    ],
  );
  return result.insertId;
}

export async function softDeletePost(id: number): Promise<void> {
  // 软删帖子同时级联软删其下所有回复 / 留言（业务级联）
  await withTransaction(async (conn) => {
    const [result] = await conn.query<ResultSetHeader>(
      `UPDATE posts SET deleted_at = UTC_TIMESTAMP(3) WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
    if (result.affectedRows > 0) {
      await softDeleteRepliesOfPost(conn, id);
    }
  });
}

export async function updateAnnouncement(
  id: number,
  patch: { subtype?: string; title?: string; content?: string; publishedAt?: Date },
): Promise<void> {
  const sets: string[] = [];
  const args: unknown[] = [];
  if (patch.subtype !== undefined) {
    sets.push("subtype = ?");
    args.push(patch.subtype);
  }
  if (patch.title !== undefined) {
    sets.push("title = ?");
    args.push(patch.title);
  }
  if (patch.content !== undefined) {
    sets.push("content = ?");
    args.push(patch.content);
  }
  if (patch.publishedAt !== undefined) {
    sets.push("published_at = ?");
    args.push(patch.publishedAt);
  }
  if (!sets.length) return;
  args.push(id);
  await getPool().query(`UPDATE posts SET ${sets.join(", ")} WHERE id = ?`, args);
}

/** Increment view; on first unique reader also bump unique_reader_count. */
export async function recordPostRead(postId: number, userId: number): Promise<void> {
  await withTransaction(async (conn) => {
    const [insertResult] = await conn.query<ResultSetHeader>(
      `INSERT IGNORE INTO post_reads (post_id, user_id, first_read_at)
       VALUES (?, ?, UTC_TIMESTAMP(3))`,
      [postId, userId],
    );
    if (insertResult.affectedRows === 1) {
      await conn.query(
        `UPDATE posts SET view_count = view_count + 1, unique_reader_count = unique_reader_count + 1
         WHERE id = ?`,
        [postId],
      );
    } else {
      await conn.query(`UPDATE posts SET view_count = view_count + 1 WHERE id = ?`, [postId]);
    }
  });
}
