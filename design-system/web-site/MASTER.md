# Nongyu Web Site Design System (MASTER)

## 1. Core Vision

- **Product**: 农屿 — 川农专属校园智慧助手
- **Job of the page**: 让学生 10 秒内理解「是什么 → 能干什么 → 怎么下载 → 怎么找人」
- **Vibe**: 学院绿地里的清透工具感 — 大留白、轻浮起设备窗、有机绿色光晕但不土
- **Audience**: 四川农业大学在读本科生

## 2. Signature

首屏大字「农屿」叠在缓缓漂移的绿色光晕大气上；功能区媒体是带轻浮起动效的「圆角设备窗」，像从 App 里裁出的玻璃屏。这是全站唯一强记忆点，其余区块保持安静。

## 3. Color (对齐 RN 川农新绿浅色)

| Token              | Hex                      | Usage            |
| ------------------ | ------------------------ | ---------------- |
| `--ny-brand`       | `#0A7C59`                | CTA、链接、强调  |
| `--ny-brand-muted` | `#D4E9DF`                | 浅底、占位、chip |
| `--ny-on-brand`    | `#FFFFFF`                | 品牌色上的字     |
| `--ny-bg`          | `#F7FAF8`                | 页面底           |
| `--ny-surface`     | `#FFFFFF`                | 浮层/卡片面      |
| `--ny-text`        | `#0F1A14`                | 主文             |
| `--ny-text-2`      | `#4A564F`                | 次文             |
| `--ny-outline`     | `#CFE3DA`                | 细边             |
| `--ny-secondary`   | `#2E7D6E`                | 次强调           |
| `--ny-glow`        | `rgba(10, 124, 89, 0.2)` | Hero 光晕        |

## 4. Typography

- **Display / 品牌**：`"Fraunces", "Noto Serif SC", serif` — 仅用于「农屿」与少数大标题，克制使用
- **UI / 正文**：`"DM Sans", "Noto Sans SC", system-ui, sans-serif`
- 基准 16px；品牌字 Hero 桌面约 clamp(3.8rem, 10vw, 6rem)

## 5. Layout & Shape

- 内容最大宽 ~1120px，水平 padding 20–32px
- 圆角：控件 999px（胶囊）、媒体窗 28px、小组件 14–16px
- 顶栏：半透明 surface + `backdrop-filter: blur(16px)`
- 功能块：桌面文/媒交替；移动上文下媒
- 媒体窗宽高比统一 **9 / 16**（手机竖屏设备窗；列内限宽以免过高）

## 6. Motion

- Hero：子元素错落入场（eyebrow → 品牌 → 副标 → 说明 → CTA）
- 进入：`translateY(18px) + opacity`，约 700ms；功能块可带阶梯 delay
- 氛围光晕缓慢漂移；设备窗 idle 轻浮起；hover 暂停浮起并微抬升
- 顶栏：滚动后加细边与阴影
- `prefers-reduced-motion: reduce` 时关闭过渡与位移

## 7. Anti-Patterns

- 禁止紫靛渐变模板、暗黑赛博、报纸细线多栏
- 禁止 Hero 内卡片墙、数据条、漂浮贴纸
- 禁止假下载外链
- 不要用 Inter / Roboto / Arial 作为品牌主字体
