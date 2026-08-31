import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const deps = { ...pkg.dependencies };
delete deps["nongyu-track-contract"]; // 已由 tsup 打进 dist
const out = {
  name: pkg.name,
  version: pkg.version,
  private: true,
  type: "module",
  engines: pkg.engines,
  scripts: { start: "node dist/index.js" },
  dependencies: deps,
};
writeFileSync(join(root, "package.deploy.json"), JSON.stringify(out, null, 2) + "\n");
console.log("wrote package.deploy.json");
