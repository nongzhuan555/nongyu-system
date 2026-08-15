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

describe("posts.read", () => {
  beforeAll(async () => {
    await ensureMigrated();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  it("increments view and unique reader correctly", async () => {
    const author = await registerAppUser({ studentNo: "202366666", deviceId: "a" });
    await promoteAdmin("202366666", "AdminPass1");
    const adminToken = await adminLogin("202366666", "AdminPass1");

    const created = await api()
      .post("/api/admin/posts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ subtype: "system", title: "公告", content: "正文" })
      .expect(200);
    const postId = created.body.data.id as number;

    const reader1 = await registerAppUser({ studentNo: "202377777", deviceId: "r1" });
    const reader2 = await registerAppUser({ studentNo: "202388888", deviceId: "r2" });

    await api()
      .get(`/api/app/posts/${postId}`)
      .set("Authorization", `Bearer ${reader1.token}`)
      .expect(200);
    await api()
      .get(`/api/app/posts/${postId}`)
      .set("Authorization", `Bearer ${reader1.token}`)
      .expect(200);
    await api()
      .get(`/api/app/posts/${postId}`)
      .set("Authorization", `Bearer ${reader2.token}`)
      .expect(200);

    const detail = await api()
      .get(`/api/admin/posts/${postId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(detail.body.data.viewCount).toBe(3);
    expect(detail.body.data.uniqueReaderCount).toBe(2);
  });

  it("keeps feedback and courtyard anonymous on app APIs; admin still sees author", async () => {
    const author = await registerAppUser({
      studentNo: "202366001",
      name: "署名应仅管理端可见",
      deviceId: "anon-a",
    });
    const peer = await registerAppUser({ studentNo: "202366002", deviceId: "anon-p" });

    const feedback = await api()
      .post("/api/app/posts")
      .set("Authorization", `Bearer ${author.token}`)
      .send({
        postType: "feedback",
        subtype: "suggestion",
        title: "匿名反馈",
        content: "内容",
      })
      .expect(200);
    const courtyard = await api()
      .post("/api/app/posts")
      .set("Authorization", `Bearer ${author.token}`)
      .send({
        postType: "courtyard",
        subtype: "life",
        title: "匿名大院",
        content: "内容",
      })
      .expect(200);

    const feedbackId = feedback.body.data.id as number;
    const courtyardId = courtyard.body.data.id as number;

    const feedbackList = await api()
      .get("/api/app/posts")
      .query({ postType: "feedback" })
      .set("Authorization", `Bearer ${peer.token}`)
      .expect(200);
    expect(feedbackList.body.data.list[0].authorDisplayName).toBeNull();

    const courtyardList = await api()
      .get("/api/app/posts")
      .query({ postType: "courtyard" })
      .set("Authorization", `Bearer ${peer.token}`)
      .expect(200);
    expect(courtyardList.body.data.list[0].authorDisplayName).toBeNull();
    expect(courtyardList.body.data.list[0]).not.toHaveProperty("authorUserId");
    expect(courtyardList.body.data.list[0]).not.toHaveProperty("authorName");
    expect(courtyardList.body.data.list[0]).not.toHaveProperty("authorStudentNo");

    const courtyardDetail = await api()
      .get(`/api/app/posts/${courtyardId}`)
      .set("Authorization", `Bearer ${peer.token}`)
      .expect(200);
    expect(courtyardDetail.body.data.authorDisplayName).toBeNull();
    expect(courtyardDetail.body.data.isMine).toBe(false);

    const ownDetail = await api()
      .get(`/api/app/posts/${courtyardId}`)
      .set("Authorization", `Bearer ${author.token}`)
      .expect(200);
    expect(ownDetail.body.data.authorDisplayName).toBeNull();
    expect(ownDetail.body.data.isMine).toBe(true);

    await promoteAdmin("202366001", "AdminPass1");
    const adminToken = await adminLogin("202366001", "AdminPass1");
    const adminDetail = await api()
      .get(`/api/admin/posts/${feedbackId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(adminDetail.body.data.authorName).toBe("署名应仅管理端可见");
    expect(adminDetail.body.data.authorStudentNo).toBe("202366001");
  });

  it("searches posts by keyword on title/content with type/subtype filters", async () => {
    const user = await registerAppUser({ studentNo: "202311111", deviceId: "s1" });

    await api()
      .post("/api/app/posts")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        postType: "courtyard",
        subtype: "life",
        title: "标题含联调关键词",
        content: "普通正文",
      })
      .expect(200);
    await api()
      .post("/api/app/posts")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        postType: "courtyard",
        subtype: "life",
        title: "另一标题",
        content: "正文里有联调字样",
      })
      .expect(200);
    await api()
      .post("/api/app/posts")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        postType: "courtyard",
        subtype: "study",
        title: "联调但标签不同",
        content: "x",
      })
      .expect(200);
    await api()
      .post("/api/app/posts")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        postType: "feedback",
        subtype: "bug",
        title: "联调反馈",
        content: "y",
      })
      .expect(200);

    const byTitleOrContent = await api()
      .get("/api/app/posts")
      .query({ postType: "courtyard", keyword: "联调" })
      .set("Authorization", `Bearer ${user.token}`)
      .expect(200);
    expect(byTitleOrContent.body.code).toBe(0);
    expect(byTitleOrContent.body.data.total).toBe(3);

    const withSubtype = await api()
      .get("/api/app/posts")
      .query({ postType: "courtyard", subtype: "life", keyword: "联调" })
      .set("Authorization", `Bearer ${user.token}`)
      .expect(200);
    expect(withSubtype.body.data.total).toBe(2);

    const blankKeyword = await api()
      .get("/api/app/posts")
      .query({ postType: "courtyard", keyword: "   " })
      .set("Authorization", `Bearer ${user.token}`)
      .expect(200);
    expect(blankKeyword.body.data.total).toBe(3);

    const tooLong = await api()
      .get("/api/app/posts")
      .query({ postType: "courtyard", keyword: "k".repeat(65) })
      .set("Authorization", `Bearer ${user.token}`)
      .expect(400);
    expect(tooLong.body.code).toBe(40001);

    const literalPercent = await api()
      .post("/api/app/posts")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        postType: "courtyard",
        subtype: "life",
        title: "含%百分号",
        content: "z",
      })
      .expect(200);
    expect(literalPercent.body.code).toBe(0);

    const escaped = await api()
      .get("/api/app/posts")
      .query({ postType: "courtyard", keyword: "%" })
      .set("Authorization", `Bearer ${user.token}`)
      .expect(200);
    expect(escaped.body.data.total).toBe(1);
    expect(escaped.body.data.list[0].title).toContain("%");
  });
});

describe("settings.users", () => {
  beforeAll(async () => {
    await ensureMigrated();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  it("reads and updates settings and qq", async () => {
    const { token } = await registerAppUser({ studentNo: "202399999" });
    const settings = await api()
      .get("/api/app/settings")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(settings.body.data.theme).toBe("sicau_green");

    const updated = await api()
      .put("/api/app/settings")
      .set("Authorization", `Bearer ${token}`)
      .send({ theme: "dark", homeIsTimetable: true })
      .expect(200);
    expect(updated.body.data.theme).toBe("dark");
    expect(updated.body.data.homeIsTimetable).toBe(true);

    const me = await api()
      .patch("/api/app/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ qq: "123456" })
      .expect(200);
    expect(me.body.data.qq).toBe("123456");
  });
});

describe("versions.dashboard", () => {
  beforeAll(async () => {
    await ensureMigrated();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  it("version check and dashboard overview smoke", async () => {
    const user = await registerAppUser({ studentNo: "202300002" });
    await promoteAdmin("202300002", "AdminPass1");
    const adminToken = await adminLogin("202300002", "AdminPass1");

    await api()
      .post("/api/admin/app-versions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        platform: "android",
        versionName: "1.0.0",
        versionCode: 10,
        releaseChannel: "native",
        forceUpdate: false,
        isPublished: true,
        downloadUrl: "https://example.com/app.apk",
      })
      .expect(200);

    const check = await api()
      .get("/api/app/versions/check")
      .query({ platform: "android", versionCode: 1 })
      .expect(200);
    expect(check.body.data.hasUpdate).toBe(true);
    expect(check.body.data.latest.versionCode).toBe(10);

    const overview = await api()
      .get("/api/admin/dashboard/overview")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(overview.body.data.totalUsers).toBeGreaterThanOrEqual(1);
    expect(overview.body.data.totalAdmins).toBeGreaterThanOrEqual(1);

    const growth = await api()
      .get("/api/admin/dashboard/user-growth")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ range: "7d" })
      .expect(200);
    expect(Array.isArray(growth.body.data.points)).toBe(true);

    // keep token referenced
    expect(user.token).toBeTruthy();
  });
});
