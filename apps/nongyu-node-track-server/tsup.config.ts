import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  clean: true,
  // 仅原生模块 external；workspace 契约包强制打进 dist（远端无该包）
  external: ["better-sqlite3"],
  noExternal: ["nongyu-track-contract"],
  esbuildOptions(options) {
    options.packages = "bundle";
  },
});
