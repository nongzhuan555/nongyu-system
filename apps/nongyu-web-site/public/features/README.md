# 功能截图（构建产物）

浏览器引用 **`*.webp`**，由 `pnpm run optimize-images`（`prebuild` 自动执行）从 `assets/feature-screens/` 源图生成。

| webp                            | 分区                   |
| ------------------------------- | ---------------------- |
| `home.webp`                     | 认识农屿               |
| `jiaowu1.webp`                  | 教务功能               |
| `course1.webp` … `course5.webp` | 课表功能（多图轮播）   |
| `second1.webp` … `second3.webp` | 二课功能（多图轮播）   |
| `agent1.webp`、`agent2.webp`    | Agent 功能（多图轮播） |
| `center.webp`                   | 广场功能               |

**换图流程：** 替换 `assets/feature-screens/` 下源文件 → 执行 `pnpm --filter nongyu-web-site build` → 若需破缓存可改 webp 文件名并同步 `site-config.ts`。

缺失时页面显示「图片占位」，不破版。媒体窗比例约 **9:16**（手机竖屏）。
