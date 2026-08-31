# 功能截图源文件（jpg/png）

构建时由 `scripts/optimize-feature-images.mjs` 转为 `public/features/*.webp`（限宽 900px、WebP quality 82）。

换图后执行：`pnpm --filter nongyu-web-site run optimize-images`（或 `build` 会自动 prebuild）。
