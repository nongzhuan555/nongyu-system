import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles, resetEnvCache } from "../src/config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");

process.env.NODE_ENV = "test";
resetEnvCache();
loadEnvFiles(path.join(appRoot, ".env.test"));
loadEnvFiles(path.join(appRoot, ".env"));
