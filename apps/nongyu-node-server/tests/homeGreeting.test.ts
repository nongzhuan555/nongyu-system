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

describe("home greetings", () => {
  beforeAll(async () => {
    await ensureMigrated();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  it("app GET returns enabled message; null when none enabled", async () => {
    const { token: appToken } = await registerAppUser({ studentNo: "202312001" });
    await promoteAdmin("202312001");
    const adminToken = await adminLogin("202312001", "AdminPass1");

    const empty = await api()
      .get("/api/app/home/greeting")
      .set("Authorization", `Bearer ${appToken}`)
      .expect(200);
    expect(empty.body.code).toBe(0);
    expect(empty.body.data).toBeNull();

    const created = await api()
      .post("/api/admin/home-greetings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ message: "今天也要加油", enabled: true })
      .expect(200);
    expect(created.body.code).toBe(0);
    const id = created.body.data.id as number;

    const got = await api()
      .get("/api/app/home/greeting")
      .set("Authorization", `Bearer ${appToken}`)
      .expect(200);
    expect(got.body.data).toEqual({ id, message: "今天也要加油" });
  });

  it("enabling one disables previous", async () => {
    await registerAppUser({ studentNo: "202312002" });
    await promoteAdmin("202312002");
    const adminToken = await adminLogin("202312002", "AdminPass1");
    const { token: appToken } = await registerAppUser({
      studentNo: "202312003",
      name: "读者",
    });

    const first = await api()
      .post("/api/admin/home-greetings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ message: "第一条问候语文案", enabled: true })
      .expect(200);
    const firstId = first.body.data.id as number;

    const second = await api()
      .post("/api/admin/home-greetings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ message: "第二条问候语文案", enabled: true })
      .expect(200);
    const secondId = second.body.data.id as number;

    const list = await api()
      .get("/api/admin/home-greetings")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    const byId = new Map(
      (list.body.data.list as { id: number; enabled: boolean }[]).map((row) => [
        row.id,
        row.enabled,
      ]),
    );
    expect(byId.get(firstId)).toBe(false);
    expect(byId.get(secondId)).toBe(true);

    const appGot = await api()
      .get("/api/app/home/greeting")
      .set("Authorization", `Bearer ${appToken}`)
      .expect(200);
    expect(appGot.body.data.message).toBe("第二条问候语文案");
  });

  it("rejects empty or too-long message; requires auth", async () => {
    await registerAppUser({ studentNo: "202312004" });
    await promoteAdmin("202312004");
    const adminToken = await adminLogin("202312004", "AdminPass1");

    await api().get("/api/app/home/greeting").expect(401);

    const empty = await api()
      .post("/api/admin/home-greetings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ message: "   " })
      .expect(400);
    expect(empty.body.code).toBe(40001);

    const tooLong = await api()
      .post("/api/admin/home-greetings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ message: "字".repeat(49) })
      .expect(400);
    expect(tooLong.body.code).toBe(40001);
  });

  it("disable all yields app null; delete works", async () => {
    await registerAppUser({ studentNo: "202312005" });
    await promoteAdmin("202312005");
    const adminToken = await adminLogin("202312005", "AdminPass1");
    const { token: appToken } = await registerAppUser({ studentNo: "202312006" });

    const created = await api()
      .post("/api/admin/home-greetings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ message: "即将关闭", enabled: true })
      .expect(200);
    const id = created.body.data.id as number;

    await api()
      .patch(`/api/admin/home-greetings/${id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ enabled: false })
      .expect(200);

    const afterDisable = await api()
      .get("/api/app/home/greeting")
      .set("Authorization", `Bearer ${appToken}`)
      .expect(200);
    expect(afterDisable.body.data).toBeNull();

    await api()
      .delete(`/api/admin/home-greetings/${id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    await api()
      .delete(`/api/admin/home-greetings/${id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(404);
  });
});
