import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { loadEnvFiles, resetEnvCache, getEnv } from "../src/config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const envTestPath = path.join(appRoot, ".env.test");

process.env.NODE_ENV = "test";
resetEnvCache();

/**
 * 禁止测试落到远程/生产库：只读 `.env.test`，且 host 必须是本机。
 * 曾因缺少 `.env.test` 回退加载 `.env` 导致 truncate 打到远端 `nongyu`。
 */
if (!fs.existsSync(envTestPath)) {
  throw new Error(
    `缺少 ${envTestPath}。请复制 .env.example 为 .env.test，并指向本机测试库（MYSQL_HOST=127.0.0.1），禁止用远端库跑 vitest。`,
  );
}

loadEnvFiles(envTestPath);

if (!process.env.INTERNAL_TOKEN) {
  process.env.INTERNAL_TOKEN = "nongyu-test-internal-token";
}
if (!process.env.SUPER_ADMIN_STUDENT_NO) {
  process.env.SUPER_ADMIN_STUDENT_NO = "202308596";
}
if (!process.env.SUPER_ADMIN_DEFAULT_PASSWORD) {
  process.env.SUPER_ADMIN_DEFAULT_PASSWORD = "SuperAdminTestPass1";
}
if (!process.env.LLM_KEY_ENCRYPTION_SECRET) {
  process.env.LLM_KEY_ENCRYPTION_SECRET = "test-llm-key-encryption-secret";
}
resetEnvCache();

const env = getEnv();
const host = env.MYSQL_HOST.trim().toLowerCase();
const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
if (!localHosts.has(host)) {
  throw new Error(
    `测试拒绝连接非本机 MySQL（MYSQL_HOST=${env.MYSQL_HOST}，库=${env.MYSQL_DATABASE}）。请把 .env.test 改为 127.0.0.1 上的独立测试库。`,
  );
}
