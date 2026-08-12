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
