# Nongyu Admin Design System (MASTER)

## 1. Core Vision

- **Concept**: Academic Tech（学院派科技感）— 与农屿 RN「川农新绿」同源
- **Vibe**: Warm, Healing yet Serious（温暖治愈且严谨）
- **Target**: Students, Student-Admin, Developers
- **Environment**: Standalone Browser & React Native WebView（需高响应）

## 2. Visual Style

- **Pattern**: 贴边壳层 + 内容区卡片；工作台可用轻量 Bento，CRUD 页用统一 PageFrame
- **Border Radius**: 卡片 12–16px；控件 10–12px（避免过大圆角导致「玩具感」）
- **Shadows**: 轻扩散阴影，`0 1px 2px / 0.04` + `0 8px 24px / 0.06`，忌厚重悬浮岛
- **Signature**: 侧栏选中项浅绿底 + 左侧品牌绿竖条

## 3. Color Palette（对齐 RN `green`）

| Token                 | Color (Hex) | Usage                  |
| --------------------- | ----------- | ---------------------- |
| **Primary**           | `#0A7C59`   | 主品牌、主按钮、选中态 |
| **Primary Container** | `#D4E9DF`   | 菜单选中底、轻强调底   |
| **On Primary**        | `#FFFFFF`   | 主色上的文字           |
| **Secondary**         | `#2E7D6E`   | 次强调、图表辅色       |
| **Tertiary**          | `#8FBF9B`   | 装饰、图表浅色         |
| **Background**        | `#FAFBFA`   | 主画布                 |
| **Surface**           | `#FFFFFF`   | 卡片 / 侧栏            |
| **Surface Variant**   | `#DEE5E1`   | 分区底、表格斑马可选   |
| **Text Primary**      | `#1F2937`   | 标题与主文案           |
| **Text Secondary**    | `#424945`   | 说明与元信息           |
| **Outline**           | `#CFE3DA`   | 边框、分割线           |
| **Danger**            | `#C62828`   | 危险操作（与 RN 一致） |

> 历史 Emerald `#10B981` / Amber `#FBBF24` 不再作为管理端主色板。

## 4. Typography

- **UI / Display**: `Source Sans 3`（拉丁）+ `PingFang SC` / `Microsoft YaHei`（中文）
- **Data / Tabular**: 同族，`tabular-nums`
- **Scale（桌面）**:
  - 页标题：22–24px / 600
  - 区块标题：16px / 600
  - 正文：14px / 400
  - 辅助：12–13px / 400，`Text Secondary`
- **Base**: 14px（管理端桌面密度）；触控场景控件高度 ≥ 44px（`pointer: coarse` 或显式 `min-h-11`）
- 移动端：Drawer 全宽、Modal 留边、`viewport-fit=cover` + safe-area；窄屏禁用大屏拖拽缩放

## 5. Technical Specifications

### React + Ant Design

- `ConfigProvider` 覆盖 token：`colorPrimary: #0A7C59`，`borderRadius: 12`，`controlHeight: 40`
- Menu 选中：`itemSelectedBg: #D4E9DF`，`itemSelectedColor: #0A7C59`

### Tailwind CSS

- Token 色：`brand` / `brand-muted` / `canvas` / `ink` / `muted` / `line`
- 卡片：`rounded-xl` 或 `rounded-2xl`，配合 `shadow-panel` 与 `border-line`
- 间距：壳层内容 `px-5 py-4`；卡片内 `p-4` / `p-5`

### ECharts

- Colors: `['#0A7C59', '#2E7D6E', '#8FBF9B', '#D4E9DF', '#5A9A86', '#A8C9B8']`
- Line：`smooth: true`
- Tooltip：圆角 + 轻 blur

### Layout

- 侧栏贴边固定宽 ~220px，**禁止**大圆角悬浮侧栏岛
- 顶栏与内容区分层清晰；页内用 `PageFrame`（标题行 + 可选操作 + 白底内容）
- 触控目标最小 40×40；移动端侧栏抽屉

## 6. Anti-Patterns (Avoid)

- 不要用 RN 以外的翠绿 / 霓虹绿当主色
- 不要 0 圆角硬边，也不要 24px+ 圆角铺满所有卡片
- 不要控件统一 48px 高度造成桌面「虚胖」
- 不要仅 hover 才能完成的关键（须支持触控）
- 不要在 CRUD 页堆砌无意义 Bento 装饰

---

_Aligned with RN green palette · Nongyu System_
