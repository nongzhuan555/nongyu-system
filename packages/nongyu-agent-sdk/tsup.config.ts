import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    /** Node-only：StdioChannel（readline），勿打进主包以免 RN Metro 失败 */
    stdio: "src/stdio.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
});
