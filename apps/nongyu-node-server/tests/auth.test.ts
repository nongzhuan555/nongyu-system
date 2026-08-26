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
    expect(kicked.body.code).toBe(40104);

    const me2 = await api()
      .get("/api/app/auth/me")
      .set("Authorization", `Bearer ${second.token}`)
      .expect(200);
    expect(me2.body.code).toBe(0);
  });

  it("same device re-login keeps previous token valid", async () => {
    const first = await registerAppUser({ studentNo: "202366666", deviceId: "same-dev" });
    const second = await registerAppUser({ studentNo: "202366666", deviceId: "same-dev" });
    expect(second.isNewUser).toBe(false);

    await api().get("/api/app/auth/me").set("Authorization", `Bearer ${first.token}`).expect(200);
    await api().get("/api/app/auth/me").set("Authorization", `Bearer ${second.token}`).expect(200);
  });

  it("logout invalidates token", async () => {
    const { token } = await registerAppUser({ studentNo: "202333333" });
    await api().post("/api/app/auth/logout").set("Authorization", `Bearer ${token}`).expect(200);
    const res = await api()
      .get("/api/app/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);
    expect(res.body.code).toBe(40104);
  });

  it("expired app token returns 40103", async () => {
    const { SignJWT } = await import("jose");
    const { getEnv } = await import("../src/config/env.js");
    const secret = new TextEncoder().encode(getEnv().JWT_SECRET);
    const token = await new SignJWT({
      uid: 1,
      studentNo: "202300001",
      tokenVersion: 1,
      typ: "app",
      deviceId: "d",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(secret);

    const res = await api()
      .get("/api/app/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);
    expect(res.body.code).toBe(40103);
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

  it("super admin can login without users row", async () => {
    const { getEnv } = await import("../src/config/env.js");
    const { getPool } = await import("../src/lib/db.js");
    const studentNo = getEnv().SUPER_ADMIN_STUDENT_NO;
    const password = getEnv().SUPER_ADMIN_DEFAULT_PASSWORD;

    const [beforeRows] = await getPool().query(
      `SELECT COUNT(*) AS c FROM users WHERE student_no = ?`,
      [studentNo],
    );
    expect(Number((beforeRows as { c: number }[])[0].c)).toBe(0);

    const res = await api()
      .post("/api/admin/auth/login")
      .send({ studentNo, adminPassword: password })
      .expect(200);
    expect(res.body.data.user.bootstrap).toBe(true);
    expect(res.body.data.user.id).toBe(0);

    const [afterRows] = await getPool().query(
      `SELECT COUNT(*) AS c FROM users WHERE student_no = ?`,
      [studentNo],
    );
    expect(Number((afterRows as { c: number }[])[0].c)).toBe(0);

    await api()
      .get("/api/admin/auth/me")
      .set("Authorization", `Bearer ${res.body.data.token}`)
      .expect(200);

    const denied = await api()
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${res.body.data.token}`)
      .expect(403);
    expect(denied.body.code).toBe(40302);
  });

  it("super admin app login forces role=2 and dual password works", async () => {
    const { getEnv } = await import("../src/config/env.js");
    const studentNo = getEnv().SUPER_ADMIN_STUDENT_NO;
    const defaultPassword = getEnv().SUPER_ADMIN_DEFAULT_PASSWORD;

    await registerAppUser({ studentNo, name: "超管" });
    const { getPool } = await import("../src/lib/db.js");
    const [rows] = await getPool().query(`SELECT role FROM users WHERE student_no = ?`, [
      studentNo,
    ]);
    expect(Number((rows as { role: number }[])[0].role)).toBe(2);

    const loginRes = await api()
      .post("/api/admin/auth/login")
      .send({ studentNo, adminPassword: defaultPassword })
      .expect(200);
    expect(loginRes.body.data.user.bootstrap).toBeUndefined();
    expect(loginRes.body.data.user.id).toBeGreaterThan(0);

    const token = loginRes.body.data.token as string;
    await api()
      .put("/api/admin/auth/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ adminPassword: "CustomAdmin9" })
      .expect(200);

    await adminLogin(studentNo, "CustomAdmin9");
    await adminLogin(studentNo, defaultPassword);
  });

  it("app handoff issues ticket and redeem yields admin session", async () => {
    const { token } = await registerAppUser({ studentNo: "202377777" });
    await promoteAdmin("202377777", "AdminPass1");

    const handoff = await api()
      .post("/api/admin/auth/app-handoff")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(handoff.body.code).toBe(0);
    expect(handoff.body.data.ticket).toBeTruthy();
    expect(handoff.body.data.expiresIn).toBe(60);

    const ticket = handoff.body.data.ticket as string;
    const redeemed = await api()
      .post("/api/admin/auth/handoff-redeem")
      .send({ ticket })
      .expect(200);
    expect(redeemed.body.data.loginType).toBe("in_app");
    expect(redeemed.body.data.user.role).toBe(1);
    expect(redeemed.body.data.user.bootstrap).toBeUndefined();

    await api()
      .get("/api/admin/auth/me")
      .set("Authorization", `Bearer ${redeemed.body.data.token}`)
      .expect(200);

    const reuse = await api().post("/api/admin/auth/handoff-redeem").send({ ticket }).expect(401);
    expect(reuse.body.code).toBe(40102);
  });

  it("app handoff rejects non-admin", async () => {
    const { token } = await registerAppUser({ studentNo: "202388888" });
    const res = await api()
      .post("/api/admin/auth/app-handoff")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
    expect(res.body.code).toBe(40302);
  });

  it("handoff-redeem rejects empty ticket", async () => {
    const res = await api().post("/api/admin/auth/handoff-redeem").send({ ticket: "" }).expect(400);
    expect(res.body.code).toBe(40001);
  });
});
