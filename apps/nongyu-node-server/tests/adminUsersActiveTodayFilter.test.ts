import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../src/lib/db.js";
import { businessDayUtcRange } from "../src/lib/time.js";
import { getEnv } from "../src/config/env.js";
import {
  adminLogin,
  api,
  cleanupTestDb,
  ensureMigrated,
  promoteAdmin,
  registerAppUser,
  truncateAll,
} from "./helpers.js";

describe("GET /api/admin/users activeToday filter", () => {
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
    await registerAppUser({ studentNo: "202388101", name: "管", deviceId: "adm-dev-2" });
    await promoteAdmin("202388101");
    await getPool().query(
      `UPDATE users SET is_online = 0, last_active_at = NULL WHERE student_no = ?`,
      ["202388101"],
    );
    return adminLogin("202388101", "AdminPass1");
  }

  it("filters users active today by last_active_at business day", async () => {
    const token = await adminToken();
    const active = await registerAppUser({
      studentNo: "202388102",
      name: "今日",
      deviceId: "act-1",
    });
    const inactive = await registerAppUser({
      studentNo: "202388103",
      name: "昨日",
      deviceId: "act-2",
    });

    const { start } = businessDayUtcRange(getEnv().BUSINESS_TZ);
    const yesterday = new Date(start.getTime() - 60 * 60 * 1000);

    await getPool().query(`UPDATE users SET last_active_at = UTC_TIMESTAMP(3) WHERE id = ?`, [
      active.user.id,
    ]);
    await getPool().query(`UPDATE users SET last_active_at = ? WHERE id = ?`, [
      yesterday,
      inactive.user.id,
    ]);

    const res = await api()
      .get("/api/admin/users")
      .query({ activeToday: 1, pageSize: 50 })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.code).toBe(0);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.list[0].studentNo).toBe("202388102");
  });

  it("rejects activeToday other than 1", async () => {
    const token = await adminToken();
    const res = await api()
      .get("/api/admin/users")
      .query({ activeToday: 0 })
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
    expect(res.body.code).toBe(40001);
  });
});
