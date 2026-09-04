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
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "vendor-react",
              test: /node_modules[\\/](react|react-dom|react-router|scheduler)/,
              priority: 40,
            },
            {
              name: "vendor-antd",
              test: /node_modules[\\/](antd|@ant-design|rc-|@rc-component)/,
              priority: 30,
            },
            {
              name: "vendor-echarts",
              test: /node_modules[\\/](echarts|echarts-for-react|zrender)/,
              priority: 30,
            },
            {
              name: "vendor-markdown",
              test: /node_modules[\\/](react-markdown|remark-|rehype-|unified|mdast|micromark|unist|remend)/,
              priority: 25,
            },
            {
              name: "vendor-agent",
              test: /[\\/](nongyu-agent-sdk|sqlite3-parser)([\\/]|$)/,
              priority: 25,
            },
          ],
        },
      },
    },
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
