# Nongyu Web Site Design System (MASTER)

## 1. Core Vision

- **Product**: 农屿 — 川农专属校园智慧助手
- **Job of the page**: 让学生 10 秒内理解「是什么 → 能干什么 → 怎么下载 → 怎么找人」
- **Vibe**: 学院绿地里的清透工具感 — 留白克制、圆角亲和、绿色有机但不土
- **Audience**: 四川农业大学在读本科生

## 2. Signature

首屏大字「农屿」叠在柔和的绿色光晕大气上（非紫渐变、非奶油衬线模板）；功能区媒体放在「圆角设备窗」里，像从 App 里裁出的一块玻璃屏。这是全站唯一强记忆点，其余区块保持安静。

## 3. Color (对齐 RN 川农新绿浅色)

| Token              | Hex                       | Usage            |
| ------------------ | ------------------------- | ---------------- |
| `--ny-brand`       | `#0A7C59`                 | CTA、链接、强调  |
| `--ny-brand-muted` | `#D4E9DF`                 | 浅底、占位、chip |
| `--ny-on-brand`    | `#FFFFFF`                 | 品牌色上的字     |
| `--ny-bg`          | `#FAFBFA`                 | 页面底           |
| `--ny-surface`     | `#FFFFFF`                 | 浮层/卡片面      |
| `--ny-text`        | `#111827`                 | 主文             |
| `--ny-text-2`      | `#424945`                 | 次文             |
| `--ny-outline`     | `#CFE3DA`                 | 细边             |
| `--ny-secondary`   | `#2E7D6E`                 | 次强调           |
| `--ny-glow`        | `rgba(10, 124, 89, 0.18)` | Hero 光晕        |

## 4. Typography

- **Display / 品牌**：`"Fraunces", "Noto Serif SC", serif` — 仅用于「农屿」与少数大标题，克制使用
- **UI / 正文**：`"DM Sans", "Noto Sans SC", system-ui, sans-serif`
- 基准 16px；品牌字 Hero 桌面约 clamp(3.5rem, 8vw, 5.5rem)

## 5. Layout & Shape

- 内容最大宽 ~1120px，水平 padding 20–32px
- 圆角：控件 999px（胶囊）、媒体窗 20–28px、小组件 12–16px
- 顶栏：半透明 surface + `backdrop-filter: blur(12px)`
- 功能块：桌面文/媒交替；移动上文下媒
- 媒体窗宽高比统一 **16 / 10**

## 6. Motion

- 进入：`translateY(12px) + opacity`，约 500ms，ease-out；IntersectionObserver 触发一次
- Hover：CTA 微抬升 / 媒体轻微 scale(1.02)
- 顶栏：滚动后加细边与阴影
- `prefers-reduced-motion: reduce` 时关闭过渡与位移

## 7. Anti-Patterns

- 禁止紫靛渐变模板、暗黑赛博、报纸细线多栏
- 禁止 Hero 内卡片墙、数据条、漂浮贴纸
- 禁止假下载外链
- 不要用 Inter / Roboto / Arial 作为品牌主字体
