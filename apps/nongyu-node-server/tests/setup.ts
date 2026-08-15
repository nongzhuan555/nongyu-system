import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles, resetEnvCache } from "../src/config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");

process.env.NODE_ENV = "test";
resetEnvCache();
loadEnvFiles(path.join(appRoot, ".env.test"));
loadEnvFiles(path.join(appRoot, ".env"));
if (!process.env.INTERNAL_TOKEN) {
  process.env.INTERNAL_TOKEN = "nongyu-test-internal-token";
}
if (!process.env.SUPER_ADMIN_STUDENT_NO) {
  process.env.SUPER_ADMIN_STUDENT_NO = "202308596";
}
if (!process.env.SUPER_ADMIN_DEFAULT_PASSWORD) {
  process.env.SUPER_ADMIN_DEFAULT_PASSWORD = "SuperAdminTestPass1";
}
resetEnvCache();
