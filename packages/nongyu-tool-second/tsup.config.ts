import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["index.ts"],
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: false,
  clean: true,
  minify: true,
  platform: "neutral",
  shims: false,
  pure: ["console.log", "console.warn", "console.error", "console.info", "console.debug"],
});
