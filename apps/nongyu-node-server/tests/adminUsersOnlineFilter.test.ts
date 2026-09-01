import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../src/lib/db.js";
import { ONLINE_FRESH_WINDOW_SEC } from "../src/modules/users/repo.js";
import {
  adminLogin,
  api,
  cleanupTestDb,
  ensureMigrated,
  promoteAdmin,
  registerAppUser,
  truncateAll,
} from "./helpers.js";

describe("GET /api/admin/users isOnline filter", () => {
  beforeAll(async () => {
    await ensureMigrated();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  async function adminToken() {
    await registerAppUser({ studentNo: "202388001", name: "管", deviceId: "adm-dev" });
    await promoteAdmin("202388001");
    // App 登录会写在线；测试筛选用，避免管理员干扰「仅在线」计数
    await getPool().query(
      `UPDATE users SET is_online = 0, last_active_at = NULL WHERE student_no = ?`,
      ["202388001"],
    );
    return adminLogin("202388001", "AdminPass1");
  }

  it("filters currently online users and clears stale", async () => {
    const token = await adminToken();
    const online = await registerAppUser({
      studentNo: "202388002",
      name: "在线",
      deviceId: "on-1",
    });
    const stale = await registerAppUser({ studentNo: "202388003", name: "过期", deviceId: "st-1" });
    await registerAppUser({ studentNo: "202388004", name: "离线", deviceId: "off-1" });
    await getPool().query(
      `UPDATE users SET is_online = 0, last_active_at = NULL WHERE student_no = ?`,
      ["202388004"],
    );

    await getPool().query(
      `UPDATE users SET is_online = 1, last_active_at = UTC_TIMESTAMP(3) WHERE id = ?`,
      [online.user.id],
    );
    await getPool().query(
      `UPDATE users
       SET is_online = 1,
           last_active_at = (UTC_TIMESTAMP(3) - INTERVAL ? SECOND)
       WHERE id = ?`,
      [ONLINE_FRESH_WINDOW_SEC + 60, stale.user.id],
    );

    const res = await api()
      .get("/api/admin/users")
      .query({ isOnline: 1, pageSize: 50 })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.code).toBe(0);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.list[0].studentNo).toBe("202388002");
    expect(res.body.data.list[0].isOnline).toBe(true);

    const [staleRow] = await getPool().query(`SELECT is_online FROM users WHERE student_no = ?`, [
      "202388003",
    ]);
    expect(Number((staleRow as { is_online: number }[])[0].is_online)).toBe(0);
  });

  it("rejects isOnline other than 1", async () => {
    const token = await adminToken();
    const res = await api()
      .get("/api/admin/users")
      .query({ isOnline: 0 })
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
    expect(res.body.code).toBe(40001);
  });
});
