import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    /** Node-only：StdioChannel（readline），勿打进主包以免 RN Metro 失败 */
    stdio: "src/stdio.ts",
    /** 教务/二课工具：子路径导出，避免未使用端打进主包 */
    jiaowu: "src/jiaowu.ts",
    second: "src/second.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
});
