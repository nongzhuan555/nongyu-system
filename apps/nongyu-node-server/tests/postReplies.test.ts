import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  adminLogin,
  api,
  cleanupTestDb,
  ensureMigrated,
  promoteAdmin,
  registerAppUser,
  truncateAll,
} from "./helpers.js";
import { getPool } from "../src/lib/db.js";

describe("postReplies", () => {
  beforeAll(async () => {
    await ensureMigrated();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  /** 创建反馈/大院帖，返回 id */
  async function createPost(
    token: string,
    postType: "feedback" | "courtyard",
    title = "标题",
  ): Promise<number> {
    const res = await api()
      .post("/api/app/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        postType,
        subtype: postType === "feedback" ? "suggestion" : "life",
        title,
        content: "正文",
      })
      .expect(200);
    return res.body.data.id as number;
  }

  /** 直接查 post_replies 软删状态 */
  async function repliesDeletedAt(postId: number): Promise<(Date | null)[]> {
    const [rows] = await getPool().query(
      `SELECT deleted_at FROM post_replies WHERE post_id = ? ORDER BY id`,
      [postId],
    );
    return (rows as { deleted_at: Date | null }[]).map((r) => r.deleted_at);
  }

  it("creates admin reply on feedback post; second create returns 409", async () => {
    const author = await registerAppUser({ studentNo: "202400001", deviceId: "d1" });
    await promoteAdmin("202400001", "AdminPass1");
    const adminToken = await adminLogin("202400001", "AdminPass1");
    const postId = await createPost(author.token, "feedback");

    const created = await api()
      .post(`/api/admin/posts/${postId}/reply`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "管理员回复内容" })
      .expect(200);
    expect(created.body.data.id).toBeGreaterThan(0);

    const second = await api()
      .post(`/api/admin/posts/${postId}/reply`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "再次回复" })
      .expect(409);
    expect(second.body.code).toBe(40901);
  });

  it("PATCH non-existent admin reply returns 404 (40404)", async () => {
    const author = await registerAppUser({ studentNo: "202400002", deviceId: "d2" });
    await promoteAdmin("202400002", "AdminPass1");
    const adminToken = await adminLogin("202400002", "AdminPass1");
    const postId = await createPost(author.token, "feedback");

    const res = await api()
      .patch(`/api/admin/posts/${postId}/reply`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "更新" })
      .expect(404);
    expect(res.body.code).toBe(40404);
  });

  it("creates courtyard comment; list visible and isMine correct", async () => {
    const author = await registerAppUser({ studentNo: "202400003", deviceId: "d3" });
    const peer = await registerAppUser({ studentNo: "202400004", deviceId: "d4" });
    const postId = await createPost(author.token, "courtyard");

    const created = await api()
      .post(`/api/app/posts/${postId}/comments`)
      .set("Authorization", `Bearer ${peer.token}`)
      .send({ content: "匿名留言" })
      .expect(200);
    expect(created.body.data.id).toBeGreaterThan(0);

    const detail = await api()
      .get(`/api/app/posts/${postId}`)
      .set("Authorization", `Bearer ${peer.token}`)
      .expect(200);
    expect(detail.body.data.comments).toHaveLength(1);
    expect(detail.body.data.comments[0].content).toBe("匿名留言");
    expect(detail.body.data.comments[0].isMine).toBe(true);

    const authorDetail = await api()
      .get(`/api/app/posts/${postId}`)
      .set("Authorization", `Bearer ${author.token}`)
      .expect(200);
    expect(authorDetail.body.data.comments[0].isMine).toBe(false);
  });

  it("POST comments on announcement/feedback returns 400 (40002)", async () => {
    const author = await registerAppUser({ studentNo: "202400005", deviceId: "d5" });
    await promoteAdmin("202400005", "AdminPass1");
    const adminToken = await adminLogin("202400005", "AdminPass1");

    const ann = await api()
      .post("/api/admin/posts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ subtype: "system", title: "公告", content: "正文" })
      .expect(200);
    const annId = ann.body.data.id as number;

    const onAnn = await api()
      .post(`/api/app/posts/${annId}/comments`)
      .set("Authorization", `Bearer ${author.token}`)
      .send({ content: "x" })
      .expect(400);
    expect(onAnn.body.code).toBe(40002);

    const fbId = await createPost(author.token, "feedback");
    const onFb = await api()
      .post(`/api/app/posts/${fbId}/comments`)
      .set("Authorization", `Bearer ${author.token}`)
      .send({ content: "x" })
      .expect(400);
    expect(onFb.body.code).toBe(40002);
  });

  it("non-owner delete comment returns 403 (40304)", async () => {
    const author = await registerAppUser({ studentNo: "202400006", deviceId: "d6" });
    const peer = await registerAppUser({ studentNo: "202400007", deviceId: "d7" });
    const other = await registerAppUser({ studentNo: "202400008", deviceId: "d8" });
    const postId = await createPost(author.token, "courtyard");

    const created = await api()
      .post(`/api/app/posts/${postId}/comments`)
      .set("Authorization", `Bearer ${peer.token}`)
      .send({ content: "留言" })
      .expect(200);
    const commentId = created.body.data.id as number;

    const res = await api()
      .delete(`/api/app/posts/${postId}/comments/${commentId}`)
      .set("Authorization", `Bearer ${other.token}`)
      .expect(403);
    expect(res.body.code).toBe(40304);
  });

  it("admin deletes any comment; soft-deleted", async () => {
    const author = await registerAppUser({ studentNo: "202400009", deviceId: "d9" });
    const peer = await registerAppUser({ studentNo: "202400010", deviceId: "d10" });
    await promoteAdmin("202400009", "AdminPass1");
    const adminToken = await adminLogin("202400009", "AdminPass1");
    const postId = await createPost(author.token, "courtyard");

    const created = await api()
      .post(`/api/app/posts/${postId}/comments`)
      .set("Authorization", `Bearer ${peer.token}`)
      .send({ content: "留言" })
      .expect(200);
    const commentId = created.body.data.id as number;

    await api()
      .delete(`/api/admin/posts/${postId}/comments/${commentId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const detail = await api()
      .get(`/api/app/posts/${postId}`)
      .set("Authorization", `Bearer ${peer.token}`)
      .expect(200);
    expect(detail.body.data.comments).toHaveLength(0);
  });

  it("deleting post cascades soft-delete to replies", async () => {
    const author = await registerAppUser({ studentNo: "202400011", deviceId: "d11" });
    const peer = await registerAppUser({ studentNo: "202400012", deviceId: "d12" });
    await promoteAdmin("202400011", "AdminPass1");
    const adminToken = await adminLogin("202400011", "AdminPass1");
    const postId = await createPost(author.token, "courtyard");

    await api()
      .post(`/api/app/posts/${postId}/comments`)
      .set("Authorization", `Bearer ${peer.token}`)
      .send({ content: "留言1" })
      .expect(200);
    await api()
      .post(`/api/app/posts/${postId}/comments`)
      .set("Authorization", `Bearer ${peer.token}`)
      .send({ content: "留言2" })
      .expect(200);

    await api()
      .delete(`/api/admin/posts/${postId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const deletedAts = await repliesDeletedAt(postId);
    expect(deletedAts.length).toBeGreaterThanOrEqual(2);
    expect(deletedAts.every((d) => d !== null)).toBe(true);
  });

  it("polling new replies: author first fetch returns items; second fetch empty", async () => {
    const author = await registerAppUser({ studentNo: "202400013", deviceId: "d13" });
    const peer = await registerAppUser({ studentNo: "202400014", deviceId: "d14" });
    await promoteAdmin("202400013", "AdminPass1");
    const adminToken = await adminLogin("202400013", "AdminPass1");
    const fbId = await createPost(author.token, "feedback", "我的反馈");
    const cyId = await createPost(author.token, "courtyard", "我的大院");

    await api()
      .post(`/api/admin/posts/${fbId}/reply`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "回复" })
      .expect(200);
    await api()
      .post(`/api/app/posts/${cyId}/comments`)
      .set("Authorization", `Bearer ${peer.token}`)
      .send({ content: "留言" })
      .expect(200);

    const first = await api()
      .get("/api/app/users/me/post-replies/new")
      .set("Authorization", `Bearer ${author.token}`)
      .expect(200);
    expect(first.body.data).toHaveLength(2);
    const kinds = first.body.data.map((r: { kind: string }) => r.kind).sort();
    expect(kinds).toEqual(["admin_reply", "comment"]);

    const second = await api()
      .get("/api/app/users/me/post-replies/new")
      .set("Authorization", `Bearer ${author.token}`)
      .expect(200);
    expect(second.body.data).toHaveLength(0);
  });

  it("polling new replies: non-author does not receive others' post replies", async () => {
    const author = await registerAppUser({ studentNo: "202400015", deviceId: "d15" });
    const peer = await registerAppUser({ studentNo: "202400016", deviceId: "d16" });
    await promoteAdmin("202400015", "AdminPass1");
    const adminToken = await adminLogin("202400015", "AdminPass1");
    const fbId = await createPost(author.token, "feedback");

    await api()
      .post(`/api/admin/posts/${fbId}/reply`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "回复" })
      .expect(200);

    const res = await api()
      .get("/api/app/users/me/post-replies/new")
      .set("Authorization", `Bearer ${peer.token}`)
      .expect(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("content length boundaries return 400 (40001)", async () => {
    const author = await registerAppUser({ studentNo: "202400017", deviceId: "d17" });
    const cyId = await createPost(author.token, "courtyard");

    const empty = await api()
      .post(`/api/app/posts/${cyId}/comments`)
      .set("Authorization", `Bearer ${author.token}`)
      .send({ content: "   " })
      .expect(400);
    expect(empty.body.code).toBe(40001);

    const tooLong = await api()
      .post(`/api/app/posts/${cyId}/comments`)
      .set("Authorization", `Bearer ${author.token}`)
      .send({ content: "x".repeat(1001) })
      .expect(400);
    expect(tooLong.body.code).toBe(40001);

    await promoteAdmin("202400017", "AdminPass1");
    const adminToken = await adminLogin("202400017", "AdminPass1");
    const fbId = await createPost(author.token, "feedback");
    const replyTooLong = await api()
      .post(`/api/admin/posts/${fbId}/reply`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "y".repeat(2001) })
      .expect(400);
    expect(replyTooLong.body.code).toBe(40001);
  });

  it("GET app/posts/:id feedback returns adminReply without author fields", async () => {
    const author = await registerAppUser({ studentNo: "202400018", deviceId: "d18" });
    await promoteAdmin("202400018", "AdminPass1");
    const adminToken = await adminLogin("202400018", "AdminPass1");
    const postId = await createPost(author.token, "feedback");

    await api()
      .post(`/api/admin/posts/${postId}/reply`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "回复正文" })
      .expect(200);

    const detail = await api()
      .get(`/api/app/posts/${postId}`)
      .set("Authorization", `Bearer ${author.token}`)
      .expect(200);
    expect(detail.body.data.adminReply).not.toBeNull();
    expect(detail.body.data.adminReply.content).toBe("回复正文");
    expect(detail.body.data.adminReply).not.toHaveProperty("authorName");
    expect(detail.body.data.adminReply).not.toHaveProperty("authorStudentNo");
  });

  it("GET app/posts/:id courtyard returns comments sorted ASC with isMine, no author fields", async () => {
    const author = await registerAppUser({ studentNo: "202400019", deviceId: "d19" });
    const peer = await registerAppUser({ studentNo: "202400020", deviceId: "d20" });
    const postId = await createPost(author.token, "courtyard");

    await api()
      .post(`/api/app/posts/${postId}/comments`)
      .set("Authorization", `Bearer ${author.token}`)
      .send({ content: "第一条" })
      .expect(200);
    await api()
      .post(`/api/app/posts/${postId}/comments`)
      .set("Authorization", `Bearer ${peer.token}`)
      .send({ content: "第二条" })
      .expect(200);

    const detail = await api()
      .get(`/api/app/posts/${postId}`)
      .set("Authorization", `Bearer ${author.token}`)
      .expect(200);
    expect(detail.body.data.comments).toHaveLength(2);
    expect(detail.body.data.comments[0].content).toBe("第一条");
    expect(detail.body.data.comments[1].content).toBe("第二条");
    expect(detail.body.data.comments[0]).not.toHaveProperty("authorName");
    expect(detail.body.data.comments[0]).not.toHaveProperty("authorStudentNo");
  });

  it("GET admin/posts/:id returns adminReply + comments with real names", async () => {
    const author = await registerAppUser({
      studentNo: "202400021",
      name: "张三",
      deviceId: "d21",
    });
    const peer = await registerAppUser({
      studentNo: "202400022",
      name: "李四",
      deviceId: "d22",
    });
    await promoteAdmin("202400021", "AdminPass1");
    const adminToken = await adminLogin("202400021", "AdminPass1");
    const fbId = await createPost(author.token, "feedback");
    const cyId = await createPost(author.token, "courtyard");

    await api()
      .post(`/api/admin/posts/${fbId}/reply`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "管理员回复" })
      .expect(200);
    await api()
      .post(`/api/app/posts/${cyId}/comments`)
      .set("Authorization", `Bearer ${peer.token}`)
      .send({ content: "李四留言" })
      .expect(200);

    const fbDetail = await api()
      .get(`/api/admin/posts/${fbId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(fbDetail.body.data.adminReply).not.toBeNull();
    expect(fbDetail.body.data.adminReply.authorName).toBe("张三");
    expect(fbDetail.body.data.adminReply.authorStudentNo).toBe("202400021");

    const cyDetail = await api()
      .get(`/api/admin/posts/${cyId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(cyDetail.body.data.comments).toHaveLength(1);
    expect(cyDetail.body.data.comments[0].authorName).toBe("李四");
    expect(cyDetail.body.data.comments[0].authorStudentNo).toBe("202400022");
  });

  it("GET received/sent lists: filters, soft-delete, pagination, no author fields", async () => {
    const author = await registerAppUser({ studentNo: "202400024", deviceId: "d24" });
    const peer = await registerAppUser({ studentNo: "202400025", deviceId: "d25" });
    // 管理员须为另一用户，否则 admin_reply.author_user_id === 帖主会被 received 过滤掉
    await registerAppUser({ studentNo: "202400026", deviceId: "d26" });
    await promoteAdmin("202400026", "AdminPass1");
    const adminToken = await adminLogin("202400026", "AdminPass1");

    const fbId = await createPost(author.token, "feedback", "我的反馈");
    const myCyId = await createPost(author.token, "courtyard", "我的大院");
    const peerCyId = await createPost(peer.token, "courtyard", "他人大院");

    await api()
      .post(`/api/admin/posts/${fbId}/reply`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "管理员回复" })
      .expect(200);
    const peerComment = await api()
      .post(`/api/app/posts/${myCyId}/comments`)
      .set("Authorization", `Bearer ${peer.token}`)
      .send({ content: "他人留言" })
      .expect(200);
    // 自己在自己帖下留言：不进 received，也不进 sent
    await api()
      .post(`/api/app/posts/${myCyId}/comments`)
      .set("Authorization", `Bearer ${author.token}`)
      .send({ content: "自留言" })
      .expect(200);
    // 对他人帖留言：进 sent
    const sentCreated = await api()
      .post(`/api/app/posts/${peerCyId}/comments`)
      .set("Authorization", `Bearer ${author.token}`)
      .send({ content: "我对他人的留言" })
      .expect(200);

    const received = await api()
      .get("/api/app/users/me/post-replies/received")
      .set("Authorization", `Bearer ${author.token}`)
      .expect(200);
    expect(received.body.data.total).toBe(2);
    expect(received.body.data.list).toHaveLength(2);
    const receivedKinds = received.body.data.list.map((r: { kind: string }) => r.kind).sort();
    expect(receivedKinds).toEqual(["admin_reply", "comment"]);
    expect(received.body.data.list[0]).not.toHaveProperty("authorName");
    expect(received.body.data.list[0]).toHaveProperty("publishedAt");
    expect(received.body.data.list.every((r: { content: string }) => r.content !== "自留言")).toBe(
      true,
    );

    // 分页：在 total=2 时 pageSize=1 应拆页
    const page1 = await api()
      .get("/api/app/users/me/post-replies/received?page=1&pageSize=1")
      .set("Authorization", `Bearer ${author.token}`)
      .expect(200);
    expect(page1.body.data.list).toHaveLength(1);
    expect(page1.body.data.pageSize).toBe(1);
    expect(page1.body.data.total).toBe(2);
    const page2 = await api()
      .get("/api/app/users/me/post-replies/received?page=2&pageSize=1")
      .set("Authorization", `Bearer ${author.token}`)
      .expect(200);
    expect(page2.body.data.list).toHaveLength(1);
    expect(page2.body.data.list[0].replyId).not.toBe(page1.body.data.list[0].replyId);

    const sent = await api()
      .get("/api/app/users/me/post-replies/sent")
      .set("Authorization", `Bearer ${author.token}`)
      .expect(200);
    expect(sent.body.data.total).toBe(1);
    expect(sent.body.data.list).toHaveLength(1);
    expect(sent.body.data.list[0].content).toBe("我对他人的留言");
    expect(sent.body.data.list[0].kind).toBe("comment");
    expect(sent.body.data.list[0].postId).toBe(peerCyId);
    expect(sent.body.data.list[0].replyId).toBe(sentCreated.body.data.id);

    // 软删他人留言 → received 少一条
    await api()
      .delete(`/api/admin/posts/${myCyId}/comments/${peerComment.body.data.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    const receivedAfter = await api()
      .get("/api/app/users/me/post-replies/received")
      .set("Authorization", `Bearer ${author.token}`)
      .expect(200);
    expect(receivedAfter.body.data.total).toBe(1);
    expect(receivedAfter.body.data.list[0].kind).toBe("admin_reply");

    // 软删帖 → 其下回复从 sent 消失
    await api()
      .delete(`/api/app/posts/${peerCyId}`)
      .set("Authorization", `Bearer ${peer.token}`)
      .expect(200);
    const sentAfter = await api()
      .get("/api/app/users/me/post-replies/sent")
      .set("Authorization", `Bearer ${author.token}`)
      .expect(200);
    expect(sentAfter.body.data.total).toBe(0);
  });

  it("GET received/sent unauthenticated returns 401", async () => {
    await api().get("/api/app/users/me/post-replies/received").expect(401);
    await api().get("/api/app/users/me/post-replies/sent").expect(401);
  });

  it("PATCH admin reply does not reset notified_author", async () => {
    const author = await registerAppUser({ studentNo: "202400023", deviceId: "d23" });
    await promoteAdmin("202400023", "AdminPass1");
    const adminToken = await adminLogin("202400023", "AdminPass1");
    const fbId = await createPost(author.token, "feedback");

    await api()
      .post(`/api/admin/posts/${fbId}/reply`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "管理员回复" })
      .expect(200);

    // 作者首次轮询 → 置位 notified_author=1
    const first = await api()
      .get("/api/app/users/me/post-replies/new")
      .set("Authorization", `Bearer ${author.token}`)
      .expect(200);
    expect(first.body.data).toHaveLength(1);

    // 管理员编辑回复（不重置 notified_author）
    await api()
      .patch(`/api/admin/posts/${fbId}/reply`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "更新后的回复" })
      .expect(200);

    // 再次轮询：已通知项不应再返回
    const second = await api()
      .get("/api/app/users/me/post-replies/new")
      .set("Authorization", `Bearer ${author.token}`)
      .expect(200);
    expect(second.body.data).toHaveLength(0);

    // 直接查 DB 确认 notified_author 仍为 1
    const [rows] = await getPool().query(
      `SELECT notified_author FROM post_replies WHERE post_id = ? AND kind = 'admin_reply'`,
      [fbId],
    );
    expect(rows[0].notified_author).toBe(1);
  });
});
