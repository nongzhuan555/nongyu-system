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
import { keyPoolScheduler } from "../src/modules/llm-pool/scheduler.js";

describe("llm-pool admin + proxy gates", () => {
  beforeAll(async () => {
    await ensureMigrated();
  });

  beforeEach(async () => {
    await truncateAll();
    keyPoolScheduler.resetForTests();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  it("admin can CRUD keys without leaking plaintext", async () => {
    await registerAppUser({ studentNo: "202311001" });
    const password = await promoteAdmin("202311001");
    const token = await adminLogin("202311001", password);

    const created = await api()
      .post("/api/admin/llm/keys")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "key-a",
        accountGroup: "acct-1",
        apiKey: "sk-secret-plain-key-1234",
        maxConcurrent: 1,
        weight: 1,
      })
      .expect(200);

    expect(created.body.code).toBe(0);
    expect(created.body.data.apiKeySuffix).toBe("1234");
    expect(JSON.stringify(created.body)).not.toContain("sk-secret-plain-key-1234");
    const id = created.body.data.id as number;

    const listed = await api()
      .get("/api/admin/llm/keys")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(listed.body.data.total).toBe(1);
    expect(JSON.stringify(listed.body)).not.toContain("sk-secret-plain-key-1234");

    await api()
      .patch(`/api/admin/llm/keys/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: 0 })
      .expect(200);

    await api()
      .delete(`/api/admin/llm/keys/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
  });

  it("proxy requires auth and returns pool unavailable when empty", async () => {
    const { token } = await registerAppUser({ studentNo: "202311002" });
    const res = await api()
      .post("/api/app/llm/v1/chat/completions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        messages: [{ role: "user", content: "hi" }],
        stream: false,
      })
      .expect(503);
    expect(res.body.code).toBe(50310);
  });

  it("admin proxy requires provisioned jwt and returns pool unavailable when empty", async () => {
    await registerAppUser({ studentNo: "202311003" });
    const password = await promoteAdmin("202311003");
    const token = await adminLogin("202311003", password);
    const res = await api()
      .post("/api/admin/llm/v1/chat/completions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        messages: [{ role: "user", content: "hi" }],
        stream: false,
      })
      .expect(503);
    expect(res.body.code).toBe(50310);
  });
});
