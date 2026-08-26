import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  adminLogin,
  api,
  ensureMigrated,
  promoteAdmin,
  promoteSuperAdmin,
  registerAppUser,
  truncateAll,
} from "./helpers.js";
import { getEnv } from "../src/config/env.js";
import { getPool } from "../src/lib/db.js";

describe("track sample rate and role=2", () => {
  beforeAll(async () => {
    await ensureMigrated();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  it("super admin can read and update sample rate", async () => {
    const studentNo = getEnv().SUPER_ADMIN_STUDENT_NO;
    const { token: appToken } = await registerAppUser({ studentNo, name: "超管" });
    const [rows] = await getPool().query(`SELECT role FROM users WHERE student_no = ?`, [
      studentNo,
    ]);
    expect(Number((rows as { role: number }[])[0].role)).toBe(2);

    const adminToken = await adminLogin(studentNo, getEnv().SUPER_ADMIN_DEFAULT_PASSWORD);

    const getRes = await api()
      .get("/api/admin/dashboard/track-sample-rate")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(getRes.body.data.sampleRate).toBe(100);

    const putRes = await api()
      .put("/api/admin/dashboard/track-sample-rate")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ sampleRate: 10 })
      .expect(200);
    expect(putRes.body.data.sampleRate).toBe(10);

    const appRes = await api()
      .get("/api/app/track/sample-rate")
      .set("Authorization", `Bearer ${appToken}`)
      .expect(200);
    expect(appRes.body.data.sampleRate).toBe(10);
  });

  it("normal admin cannot read or update sample rate", async () => {
    await registerAppUser({ studentNo: "202300010" });
    await promoteAdmin("202300010");
    const token = await adminLogin("202300010", "AdminPass1");

    await api()
      .get("/api/admin/dashboard/track-sample-rate")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);

    await api()
      .put("/api/admin/dashboard/track-sample-rate")
      .set("Authorization", `Bearer ${token}`)
      .send({ sampleRate: 50 })
      .expect(403);
  });

  it("rejects invalid sample rate", async () => {
    const studentNo = getEnv().SUPER_ADMIN_STUDENT_NO;
    await registerAppUser({ studentNo });
    const token = await adminLogin(studentNo, getEnv().SUPER_ADMIN_DEFAULT_PASSWORD);

    await api()
      .put("/api/admin/dashboard/track-sample-rate")
      .set("Authorization", `Bearer ${token}`)
      .send({ sampleRate: 101 })
      .expect(400);
  });

  it("only super admin can patch user role", async () => {
    const target = await registerAppUser({ studentNo: "202300020" });
    await promoteAdmin("202300011");
    const normalAdminToken = await adminLogin("202300011", "AdminPass1");

    await api()
      .patch(`/api/admin/users/${target.user.id}`)
      .set("Authorization", `Bearer ${normalAdminToken}`)
      .send({ role: 1 })
      .expect(403);

    const superNo = getEnv().SUPER_ADMIN_STUDENT_NO;
    await promoteSuperAdmin(superNo);
    const superToken = await adminLogin(superNo, getEnv().SUPER_ADMIN_DEFAULT_PASSWORD);

    const okRes = await api()
      .patch(`/api/admin/users/${target.user.id}`)
      .set("Authorization", `Bearer ${superToken}`)
      .send({ role: 1 })
      .expect(200);
    expect(okRes.body.data.role).toBe(1);
  });
});
