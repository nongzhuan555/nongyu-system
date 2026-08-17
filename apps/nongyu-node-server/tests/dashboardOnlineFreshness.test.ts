import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../src/lib/db.js";
import { getOverview } from "../src/modules/dashboard/service.js";
import {
  clearStaleOnlineUsers,
  findUserById,
  ONLINE_FRESH_WINDOW_SEC,
} from "../src/modules/users/repo.js";
import { cleanupTestDb, ensureMigrated, registerAppUser, truncateAll } from "./helpers.js";

describe("dashboard.overview online freshness", () => {
  beforeAll(async () => {
    await ensureMigrated();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  it("clears stale is_online and excludes them from onlineUsers", async () => {
    const created = await registerAppUser({ studentNo: "202399010", deviceId: "stale-1" });
    const userId = created.user.id as number;

    // 模拟「登录写了在线、Track 离线回写失败」：在线位仍为 1，但活跃时间已过窗口
    await getPool().query(
      `UPDATE users
       SET is_online = 1,
           last_active_at = (UTC_TIMESTAMP(3) - INTERVAL ? SECOND)
       WHERE id = ?`,
      [ONLINE_FRESH_WINDOW_SEC + 60, userId],
    );

    const cleared = await clearStaleOnlineUsers();
    expect(cleared).toBeGreaterThanOrEqual(1);
    expect((await findUserById(userId))?.is_online).toBe(0);

    // 再造一条过期在线，由 getOverview 顺带清理
    await getPool().query(
      `UPDATE users
       SET is_online = 1,
           last_active_at = (UTC_TIMESTAMP(3) - INTERVAL ? SECOND)
       WHERE id = ?`,
      [ONLINE_FRESH_WINDOW_SEC + 60, userId],
    );
    const overview = await getOverview();
    expect(overview.onlineUsers).toBe(0);
    expect((await findUserById(userId))?.is_online).toBe(0);
  });

  it("counts fresh online users", async () => {
    const created = await registerAppUser({ studentNo: "202399011", deviceId: "fresh-1" });
    const userId = created.user.id as number;
    await getPool().query(
      `UPDATE users SET is_online = 1, last_active_at = UTC_TIMESTAMP(3) WHERE id = ?`,
      [userId],
    );
    const overview = await getOverview();
    expect(overview.onlineUsers).toBe(1);
  });
});
