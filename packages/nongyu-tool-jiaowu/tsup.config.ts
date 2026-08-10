import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["index.ts"], // 入口文件
  format: ["esm"], // 输出 ESM 格式 (import/export)
  dts: true, // 生成 .d.ts 类型声明文件
  splitting: false, // 不启用代码分割，所有代码打进单一文件
  sourcemap: false, // 不生成 .map 文件，减小发布体积
  clean: true, // 构建前清空 dist/ 目录
  minify: true, // esbuild 压缩：删除空格/注释、缩短变量名
  platform: "neutral", // 跨平台输出：Node / 浏览器 / React Native 通用
  shims: false, // 不注入 CJS/Node 垫片（源代码无 CJS 依赖，不需要）
  pure: [
    // 标记无副作用的函数，压缩时安全删除其调用
    "console.log",
    "console.warn",
    "console.error",
    "console.info",
    "console.debug",
    "console.trace",
    "console.table",
  ],
});
