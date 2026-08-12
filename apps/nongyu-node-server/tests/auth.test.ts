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

describe("auth.app", () => {
  beforeAll(async () => {
    await ensureMigrated();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  it("login registers new user and returns token", async () => {
    const { token, isNewUser, user } = await registerAppUser({ studentNo: "202311111" });
    expect(isNewUser).toBe(true);
    expect(token).toBeTruthy();
    expect(user.studentNo).toBe("202311111");
  });

  it("rejects invalid studentNo", async () => {
    const res = await api()
      .post("/api/app/auth/login")
      .send({ studentNo: "123", name: "x", deviceId: "d1" })
      .expect(400);
    expect(res.body.code).toBe(40001);
  });

  it("kicks old device when new device logs in", async () => {
    const first = await registerAppUser({ studentNo: "202322222", deviceId: "dev-1" });
    const me1 = await api()
      .get("/api/app/auth/me")
      .set("Authorization", `Bearer ${first.token}`)
      .expect(200);
    expect(me1.body.code).toBe(0);

    const second = await registerAppUser({ studentNo: "202322222", deviceId: "dev-2" });
    expect(second.isNewUser).toBe(false);

    const kicked = await api()
      .get("/api/app/auth/me")
      .set("Authorization", `Bearer ${first.token}`)
      .expect(401);
    expect(kicked.body.code).toBe(40102);

    const me2 = await api()
      .get("/api/app/auth/me")
      .set("Authorization", `Bearer ${second.token}`)
      .expect(200);
    expect(me2.body.code).toBe(0);
  });

  it("logout invalidates token", async () => {
    const { token } = await registerAppUser({ studentNo: "202333333" });
    await api().post("/api/app/auth/logout").set("Authorization", `Bearer ${token}`).expect(200);
    const res = await api()
      .get("/api/app/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);
    expect(res.body.code).toBe(40102);
  });

  it("disabled account cannot login", async () => {
    await registerAppUser({ studentNo: "202344444" });
    const { getPool } = await import("../src/lib/db.js");
    await getPool().query(`UPDATE users SET status = 0 WHERE student_no = '202344444'`);
    const res = await api()
      .post("/api/app/auth/login")
      .send({ studentNo: "202344444", name: "禁", deviceId: "d" })
      .expect(403);
    expect(res.body.code).toBe(40301);
  });
});

describe("auth.admin", () => {
  beforeAll(async () => {
    await ensureMigrated();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  it("admin login requires role and password", async () => {
    await registerAppUser({ studentNo: "202355555" });
    const failRole = await api()
      .post("/api/admin/auth/login")
      .send({ studentNo: "202355555", adminPassword: "AdminPass1" })
      .expect(403);
    expect(failRole.body.code).toBe(40302);

    await promoteAdmin("202355555", "AdminPass1");
    const wrong = await api()
      .post("/api/admin/auth/login")
      .send({ studentNo: "202355555", adminPassword: "wrongpass" })
      .expect(403);
    expect(wrong.body.code).toBe(40303);

    const token = await adminLogin("202355555", "AdminPass1");
    const me = await api()
      .get("/api/admin/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(me.body.data.role).toBe(1);
  });
});
