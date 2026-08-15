import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getEnv } from "../src/config/env.js";
import { findUserById } from "../src/modules/users/repo.js";
import { api, cleanupTestDb, ensureMigrated, registerAppUser, truncateAll } from "./helpers.js";

describe("internal.presence", () => {
  beforeAll(async () => {
    await ensureMigrated();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  it("rejects missing or wrong internal token", async () => {
    await api().post("/api/internal/users/presence").send({}).expect(401);
    await api()
      .post("/api/internal/users/presence")
      .set("X-Internal-Token", "wrong-token-value-xx")
      .send({ user_id: 1, is_online: 1, last_active_at_ms: Date.now() })
      .expect(401);
  });

  it("updates is_online and last_active_at", async () => {
    const created = await registerAppUser({ studentNo: "202399001", deviceId: "p1" });
    const userId = created.user.id as number;
    const token = getEnv().INTERNAL_TOKEN;
    const at = Date.UTC(2026, 7, 14, 8, 0, 0);

    const res = await api()
      .post("/api/internal/users/presence")
      .set("X-Internal-Token", token)
      .send({ user_id: userId, is_online: 0, last_active_at_ms: at })
      .expect(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.isOnline).toBe(false);

    const row = await findUserById(userId);
    expect(row?.is_online).toBe(0);
    expect(row?.last_active_at?.toISOString()).toBe(new Date(at).toISOString());
  });

  it("returns 404 when user does not exist", async () => {
    await api()
      .post("/api/internal/users/presence")
      .set("X-Internal-Token", getEnv().INTERNAL_TOKEN)
      .send({ user_id: 999999, is_online: 1, last_active_at_ms: Date.now() })
      .expect(404);
  });
});
