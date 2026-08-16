import { beforeAll, describe, expect, it } from "vitest";
import { ensureMigrated } from "./helpers.js";
import { getEnv, resetEnvCache } from "../src/config/env.js";
import { decryptApiKey, encryptApiKey, suffixOf } from "../src/modules/llm-pool/crypto.js";

describe("llm-pool crypto", () => {
  beforeAll(async () => {
    process.env.LLM_KEY_ENCRYPTION_SECRET =
      process.env.LLM_KEY_ENCRYPTION_SECRET || "test-llm-key-encryption-secret";
    resetEnvCache();
    await ensureMigrated();
    getEnv();
  });

  it("roundtrips encrypt/decrypt", () => {
    const plain = "sk-test-zhipu-key-abcdef";
    const cipher = encryptApiKey(plain);
    expect(cipher.startsWith("v1:")).toBe(true);
    expect(decryptApiKey(cipher)).toBe(plain);
  });

  it("suffixOf returns last 4", () => {
    expect(suffixOf("abcdefgh")).toBe("efgh");
  });
});
