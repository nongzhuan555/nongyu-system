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

describe("agent chat suggestions", () => {
  beforeAll(async () => {
    await ensureMigrated();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  it("app GET returns enabled items ordered; empty when none", async () => {
    const { token: appToken } = await registerAppUser({ studentNo: "202313001" });
    await promoteAdmin("202313001");
    const adminToken = await adminLogin("202313001", "AdminPass1");

    const empty = await api()
      .get("/api/app/agent/chat-suggestions")
      .set("Authorization", `Bearer ${appToken}`)
      .expect(200);
    expect(empty.body.code).toBe(0);
    expect(empty.body.data.items).toEqual([]);

    const a = await api()
      .post("/api/admin/agent-chat-suggestions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ text: "看看我的课表", enabled: true, sortOrder: 20 })
      .expect(200);
    const b = await api()
      .post("/api/admin/agent-chat-suggestions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ text: "查一下我的成绩", enabled: true, sortOrder: 10 })
      .expect(200);

    const got = await api()
      .get("/api/app/agent/chat-suggestions")
      .set("Authorization", `Bearer ${appToken}`)
      .expect(200);
    expect(got.body.data.items).toEqual([
      { id: b.body.data.id, text: "查一下我的成绩" },
      { id: a.body.data.id, text: "看看我的课表" },
    ]);
  });

  it("multiple enabled; disabled excluded; app capped at 6", async () => {
    await registerAppUser({ studentNo: "202313002" });
    await promoteAdmin("202313002");
    const adminToken = await adminLogin("202313002", "AdminPass1");
    const { token: appToken } = await registerAppUser({ studentNo: "202313003" });

    for (let i = 1; i <= 7; i++) {
      await api()
        .post("/api/admin/agent-chat-suggestions")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ text: `建议文案${i}`, enabled: true, sortOrder: i })
        .expect(200);
    }
    await api()
      .post("/api/admin/agent-chat-suggestions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ text: "未启用建议", enabled: false, sortOrder: 0 })
      .expect(200);

    const got = await api()
      .get("/api/app/agent/chat-suggestions")
      .set("Authorization", `Bearer ${appToken}`)
      .expect(200);
    expect(got.body.data.items).toHaveLength(6);
    expect(got.body.data.items.map((x: { text: string }) => x.text)).toEqual([
      "建议文案1",
      "建议文案2",
      "建议文案3",
      "建议文案4",
      "建议文案5",
      "建议文案6",
    ]);
  });

  it("rejects empty or too-long text; requires auth", async () => {
    await registerAppUser({ studentNo: "202313004" });
    await promoteAdmin("202313004");
    const adminToken = await adminLogin("202313004", "AdminPass1");

    await api().get("/api/app/agent/chat-suggestions").expect(401);

    const empty = await api()
      .post("/api/admin/agent-chat-suggestions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ text: "   " })
      .expect(400);
    expect(empty.body.code).toBe(40001);

    const tooLong = await api()
      .post("/api/admin/agent-chat-suggestions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ text: "字".repeat(25) })
      .expect(400);
    expect(tooLong.body.code).toBe(40001);
  });

  it("patch disable and delete", async () => {
    await registerAppUser({ studentNo: "202313005" });
    await promoteAdmin("202313005");
    const adminToken = await adminLogin("202313005", "AdminPass1");
    const { token: appToken } = await registerAppUser({ studentNo: "202313006" });

    const created = await api()
      .post("/api/admin/agent-chat-suggestions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ text: "即将关闭", enabled: true, sortOrder: 1 })
      .expect(200);
    const id = created.body.data.id as number;

    await api()
      .patch(`/api/admin/agent-chat-suggestions/${id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ enabled: false })
      .expect(200);

    const afterDisable = await api()
      .get("/api/app/agent/chat-suggestions")
      .set("Authorization", `Bearer ${appToken}`)
      .expect(200);
    expect(afterDisable.body.data.items).toEqual([]);

    await api()
      .delete(`/api/admin/agent-chat-suggestions/${id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    await api()
      .delete(`/api/admin/agent-chat-suggestions/${id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(404);
  });
});
