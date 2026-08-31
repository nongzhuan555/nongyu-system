import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // 开发：浏览器仍请求 /v1/track/web/*，由 Vite 转发到远程 Track（默认生产 Track 机）
  const trackProxyTarget = env.VITE_TRACK_PROXY_TARGET || "https://47.108.74.61";

  return {
    root: ".",
    publicDir: "public",
    server: {
      port: 5174,
      proxy: {
        "/v1/track/web": {
          target: trackProxyTarget,
          changeOrigin: true,
          secure: true,
        },
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  };
});
