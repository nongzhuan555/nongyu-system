import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** 开发期把 /api 转到本机 Node，避免浏览器直连 CORS。 */
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ["nongyu-agent-sdk"],
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
});
