import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getEnv } from "../src/config/env.js";
import { getPool } from "../src/lib/db.js";
import { businessDayUtcRange } from "../src/lib/time.js";
import { findUserById } from "../src/modules/users/repo.js";
import { api, cleanupTestDb, ensureMigrated, registerAppUser, truncateAll } from "./helpers.js";

describe("internal.presence active_days", () => {
  beforeAll(async () => {
    await ensureMigrated();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  function token() {
    return getEnv().INTERNAL_TOKEN;
  }

  it("increments active_days once per business day", async () => {
    const created = await registerAppUser({ studentNo: "202399011", deviceId: "ad1" });
    const userId = created.user.id as number;
    // 注册已计入当日 1 天
    let row = await findUserById(userId);
    expect(row?.active_days).toBe(1);

    const { start } = businessDayUtcRange(getEnv().BUSINESS_TZ);
    const todayMs = start.getTime() + 12 * 60 * 60 * 1000;
    const yesterdayMs = start.getTime() - 12 * 60 * 60 * 1000;

    await api()
      .post("/api/internal/users/presence")
      .set("X-Internal-Token", token())
      .send({ user_id: userId, is_online: 1, last_active_at_ms: todayMs })
      .expect(200);

    row = await findUserById(userId);
    expect(row?.active_days).toBe(1);

    await api()
      .post("/api/internal/users/presence")
      .set("X-Internal-Token", token())
      .send({ user_id: userId, is_online: 1, last_active_at_ms: yesterdayMs })
      .expect(200);

    row = await findUserById(userId);
    // 昨日与今日各计一日；若注册日=今日则昨日+1 → 2
    expect(row?.active_days).toBe(2);

    await api()
      .post("/api/internal/users/presence")
      .set("X-Internal-Token", token())
      .send({ user_id: userId, is_online: 0, last_active_at_ms: yesterdayMs })
      .expect(200);

    row = await findUserById(userId);
    expect(row?.active_days).toBe(2);
  });
});

describe("GET /api/admin/users sortBy activeDays", () => {
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
    const { promoteAdmin, adminLogin } = await import("./helpers.js");
    await registerAppUser({ studentNo: "202388201", name: "管", deviceId: "adm-ad" });
    await promoteAdmin("202388201");
    return adminLogin("202388201", "AdminPass1");
  }

  it("sorts by activeDays with id ASC tie-break", async () => {
    const token = await adminToken();
    const a = await registerAppUser({ studentNo: "202388202", name: "甲", deviceId: "a1" });
    const b = await registerAppUser({ studentNo: "202388203", name: "乙", deviceId: "b1" });
    const c = await registerAppUser({ studentNo: "202388204", name: "丙", deviceId: "c1" });

    await getPool().query(`UPDATE users SET active_days = 5 WHERE id = ?`, [a.user.id]);
    await getPool().query(`UPDATE users SET active_days = 5 WHERE id = ?`, [b.user.id]);
    await getPool().query(`UPDATE users SET active_days = 3 WHERE id = ?`, [c.user.id]);

    const res = await api()
      .get("/api/admin/users")
      .query({ sortBy: "activeDays", sortOrder: "desc", pageSize: 50 })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.code).toBe(0);
    const list = res.body.data.list as Array<{ studentNo: string; activeDays: number }>;
    const ranked = list.filter((u) =>
      ["202388202", "202388203", "202388204"].includes(u.studentNo),
    );
    expect(ranked.map((u) => u.studentNo)).toEqual(["202388202", "202388203", "202388204"]);
    expect(ranked[0].activeDays).toBe(5);
    expect(ranked[1].activeDays).toBe(5);
    expect(ranked[2].activeDays).toBe(3);
  });

  it("rejects sortOrder without sortBy", async () => {
    const token = await adminToken();
    await api()
      .get("/api/admin/users")
      .query({ sortOrder: "asc" })
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });
});

describe("GET /api/admin/dashboard/active-days-ranking", () => {
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
    const { promoteAdmin, adminLogin } = await import("./helpers.js");
    await registerAppUser({ studentNo: "202388301", name: "管", deviceId: "adm-rk" });
    await promoteAdmin("202388301");
    return adminLogin("202388301", "AdminPass1");
  }

  it("returns ranking excluding zero and disabled", async () => {
    const token = await adminToken();
    const okUser = await registerAppUser({ studentNo: "202388302", name: "活", deviceId: "r1" });
    const zero = await registerAppUser({ studentNo: "202388303", name: "零", deviceId: "r2" });
    const banned = await registerAppUser({ studentNo: "202388304", name: "禁", deviceId: "r3" });

    await getPool().query(`UPDATE users SET active_days = 8 WHERE id = ?`, [okUser.user.id]);
    await getPool().query(`UPDATE users SET active_days = 0 WHERE id = ?`, [zero.user.id]);
    await getPool().query(`UPDATE users SET active_days = 9, status = 0 WHERE id = ?`, [
      banned.user.id,
    ]);
    // 管理员账号注册时可能已有 1；清零以免干扰
    await getPool().query(`UPDATE users SET active_days = 0 WHERE student_no = ?`, ["202388301"]);

    const res = await api()
      .get("/api/admin/dashboard/active-days-ranking")
      .query({ limit: 50, order: "desc" })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.code).toBe(0);
    expect(res.body.data.limit).toBe(50);
    expect(res.body.data.order).toBe("desc");
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.list[0].studentNo).toBe("202388302");
    expect(res.body.data.list[0].activeDays).toBe(8);
  });

  it("rejects invalid limit", async () => {
    const token = await adminToken();
    await api()
      .get("/api/admin/dashboard/active-days-ranking")
      .query({ limit: 75 })
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });
});
