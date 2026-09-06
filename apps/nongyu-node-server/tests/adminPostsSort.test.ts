import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../src/lib/db.js";
import {
  adminLogin,
  api,
  cleanupTestDb,
  ensureMigrated,
  promoteAdmin,
  registerAppUser,
  truncateAll,
} from "./helpers.js";

describe("GET /api/admin/posts sorting", () => {
  beforeAll(async () => {
    await ensureMigrated();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  async function seedAdmin() {
    await registerAppUser({ studentNo: "202388401", name: "管", deviceId: "adm-ps" });
    await promoteAdmin("202388401");
    return adminLogin("202388401", "AdminPass1");
  }

  async function createAnnouncement(
    token: string,
    title: string,
    publishedAt: string,
  ): Promise<number> {
    const res = await api()
      .post("/api/admin/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        subtype: "system",
        title,
        content: `${title}-正文`,
        publishedAt,
      })
      .expect(200);
    return res.body.data.id as number;
  }

  async function createCourtyard(token: string, title: string): Promise<number> {
    const res = await api()
      .post("/api/app/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        postType: "courtyard",
        subtype: "life",
        title,
        content: `${title}-正文`,
      })
      .expect(200);
    return res.body.data.id as number;
  }

  async function addComments(postId: number, authorUserId: number, count: number) {
    const pool = getPool();
    for (let i = 0; i < count; i += 1) {
      await pool.query(
        `INSERT INTO post_replies (post_id, kind, author_user_id, content)
         VALUES (?, 'comment', ?, ?)`,
        [postId, authorUserId, `留言${i + 1}`],
      );
    }
  }

  it("defaults to published_at DESC", async () => {
    const token = await seedAdmin();
    const idOld = await createAnnouncement(token, "旧公告", "2024-01-01T00:00:00.000Z");
    const idMid = await createAnnouncement(token, "中公告", "2024-06-01T00:00:00.000Z");
    const idNew = await createAnnouncement(token, "新公告", "2025-01-01T00:00:00.000Z");

    const res = await api()
      .get("/api/admin/posts")
      .query({ postType: "announcement", pageSize: 10 })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.code).toBe(0);
    const ids = (res.body.data.list as Array<{ id: number }>).map((p) => p.id);
    expect(ids).toEqual([idNew, idMid, idOld]);
  });

  it("sorts by viewCount desc and asc", async () => {
    const token = await seedAdmin();
    const idLow = await createAnnouncement(token, "低阅读", "2024-03-01T00:00:00.000Z");
    const idHigh = await createAnnouncement(token, "高阅读", "2024-02-01T00:00:00.000Z");
    const idMid = await createAnnouncement(token, "中阅读", "2024-01-01T00:00:00.000Z");

    await getPool().query(`UPDATE posts SET view_count = ? WHERE id = ?`, [1, idLow]);
    await getPool().query(`UPDATE posts SET view_count = ? WHERE id = ?`, [50, idHigh]);
    await getPool().query(`UPDATE posts SET view_count = ? WHERE id = ?`, [10, idMid]);

    const desc = await api()
      .get("/api/admin/posts")
      .query({ postType: "announcement", sortBy: "viewCount", sortOrder: "desc", pageSize: 10 })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(desc.body.code).toBe(0);
    expect((desc.body.data.list as Array<{ id: number }>).map((p) => p.id)).toEqual([
      idHigh,
      idMid,
      idLow,
    ]);
    expect((desc.body.data.list as Array<{ viewCount: number }>).map((p) => p.viewCount)).toEqual([
      50, 10, 1,
    ]);

    const asc = await api()
      .get("/api/admin/posts")
      .query({ postType: "announcement", sortBy: "viewCount", sortOrder: "asc", pageSize: 10 })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(asc.body.code).toBe(0);
    expect((asc.body.data.list as Array<{ id: number }>).map((p) => p.id)).toEqual([
      idLow,
      idMid,
      idHigh,
    ]);
  });

  it("sorts by replyCount desc with pagination continuity", async () => {
    const author = await registerAppUser({
      studentNo: "202388402",
      name: "作者",
      deviceId: "ps-a",
    });
    const peer = await registerAppUser({
      studentNo: "202388403",
      name: "留言者",
      deviceId: "ps-p",
    });
    await promoteAdmin("202388402");
    const token = await adminLogin("202388402", "AdminPass1");

    const id0 = await createCourtyard(author.token, "零留言");
    const id1 = await createCourtyard(author.token, "一留言");
    const id2 = await createCourtyard(author.token, "二留言");
    const id3 = await createCourtyard(author.token, "三留言");

    await addComments(id1, peer.user.id as number, 1);
    await addComments(id2, peer.user.id as number, 2);
    await addComments(id3, peer.user.id as number, 3);

    // 软删一条留言，不应计入 replyCount 排序
    await getPool().query(
      `UPDATE post_replies SET deleted_at = UTC_TIMESTAMP(3)
       WHERE post_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id3],
    );

    const page1 = await api()
      .get("/api/admin/posts")
      .query({
        postType: "courtyard",
        sortBy: "replyCount",
        sortOrder: "desc",
        page: 1,
        pageSize: 2,
      })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(page1.body.code).toBe(0);
    expect(page1.body.data.total).toBe(4);
    const p1 = page1.body.data.list as Array<{ id: number; replyCount: number }>;
    // 并列时 published_at DESC, id DESC → 后创建的 id3 在前
    expect(p1.map((p) => p.id)).toEqual([id3, id2]);
    expect(p1.map((p) => p.replyCount)).toEqual([2, 2]);

    const page2 = await api()
      .get("/api/admin/posts")
      .query({
        postType: "courtyard",
        sortBy: "replyCount",
        sortOrder: "desc",
        page: 2,
        pageSize: 2,
      })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const p2 = page2.body.data.list as Array<{ id: number; replyCount: number }>;
    expect(p2.map((p) => p.id)).toEqual([id1, id0]);
    expect(p2.map((p) => p.replyCount)).toEqual([1, 0]);
  });

  it("rejects sortOrder without sortBy", async () => {
    const token = await seedAdmin();
    await api()
      .get("/api/admin/posts")
      .query({ sortOrder: "desc" })
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });

  it("rejects invalid sortBy", async () => {
    const token = await seedAdmin();
    await api()
      .get("/api/admin/posts")
      .query({ sortBy: "coverageRate" })
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });
});
