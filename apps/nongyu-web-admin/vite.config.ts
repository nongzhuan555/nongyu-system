import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** 开发期把 /api 转到本机 Node，避免浏览器直连 CORS。生产挂在 Nginx /admin/。 */
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/admin/" : "/",
  plugins: [react()],
  optimizeDeps: {
    include: ["nongyu-agent-sdk"],
  },
  build: {
    chunkSizeWarningLimit: 900,
    // 不做强制 vendor groups：与懒加载页组合易产生 chunk 循环依赖导致白屏
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
}));
