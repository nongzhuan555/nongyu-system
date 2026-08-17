import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  publicDir: "public",
  server: {
    port: 5174,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
