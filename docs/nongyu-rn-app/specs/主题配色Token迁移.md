# Spec：主题配色 Token 迁移（v3 → 新 RN）

| 项       | 内容                                                                        |
| -------- | --------------------------------------------------------------------------- |
| 应用     | `apps/nongyu-rn-app`                                                        |
| 需求类型 | **基建**                                                                    |
| PRD      | `docs/forhuman/rawprds/nongyu-rn-app/MyPage/设置页面PRD.md`（主题切换相关） |
| 色板来源 | `old-code/nongyu/src/theme/index.ts`（v3 `BRAND_PALETTES` + darkExtras）    |
| 状态     | **已实现（仅色板）**                                                        |

---

## 1. 背景

设置页 PRD 要求保留川农新绿、樱花浅粉、暗黑与跟随系统。新版 `src/theme/tokens.ts` 仅有一套近似绿系占位色（`#2E7D32` 等），与 v3 正式色板不一致。

本次先把 v3 **完整配色数据**迁入新版 Design Token 层，作为后续主题切换的唯一色板来源；**不实现**切换 UI、store 接线与跟随系统。

---

## 2. 目标

1. 将 v3 川农新绿（`green`/`default`）、樱花浅粉（`sakura`）全部色值迁入新版主题模块，色值与 v3 **逐项一致**（Hex 大小写可统一为大写）。
2. 将 v3 暗色表面覆盖层（`darkExtras` 中的背景/表面/描边等）单独迁入，供后续暗色模式复用。
3. 应用默认生效色板改为 **川农新绿**（替换当前占位绿 `#2E7D32`）。
4. 现有页面继续通过统一 token 取色，默认视觉切换到川农新绿，无需本迭代改造业务组件结构。
5. Token 结构可被后续「主题切换」直接消费（按 brand / 明暗取色），本次只导出数据与默认解析，不接开关。

---

## 3. 边界（非目标）

- 不实现主题切换 UI（设置页）。
- 不实现 `mode`（light/dark/system）运行时切换、系统外观监听、MMKV/AsyncStorage 主题偏好读写。
- 不改造 `useSessionStore.themeMode` 的业务语义（可保留占位，本次不接线）。
- 不引入 React Native Paper / MobX；不回迁 v3 ThemeStore。
- 不编写独立技术方案文档（本需求跳过 tech）。
- 不在本次写完整 `design-system/rn-app/MASTER.md`（色板以代码 token 为准）。
- 不调整非颜色 token 的业务含义（`space` / `radius` / `fontSize` / `tabBar` 布局数值保持现状；`tabBar` 内与玻璃相关的 rgba 可暂留，不强制对齐 v3）。

---

## 4. 详细需求

### 4.1 品牌与色板集合

| 标识（代码） | UI 名（后续设置页） | 说明                                                                          |
| ------------ | ------------------- | ----------------------------------------------------------------------------- |
| `green`      | 川农新绿            | 默认；v3 中 `default` 与 `green` 同色，新版只保留 `green`，不再导出 `default` |
| `sakura`     | 樱花浅粉            | 可选品牌色                                                                    |

暗色不是独立 brand，而是一组 **表面/文字/描边覆盖色**（与 v3 一致），品牌主色在暗色下仍取当前 brand 的 `primary` / `secondary` / `tertiary`（切换逻辑后续再做）。

### 4.2 必须迁入的色值（与 v3 一致）

#### 4.2.1 川农新绿 `green`

| 字段               | Hex           |
| ------------------ | ------------- |
| primary            | `#0A7C59`     |
| onPrimary          | `#FFFFFF`     |
| primaryContainer   | `#D4E9DF`     |
| onPrimaryContainer | `#042116`     |
| secondary          | `#2E7D6E`     |
| onSecondary        | `#FFFFFF`     |
| tertiary           | `#8FBF9B`     |
| background         | `#FAFBFA`     |
| onBackground       | `#111827`     |
| surface            | `#FFFFFF`     |
| onSurface          | `#1F2937`     |
| surfaceVariant     | `#DEE5E1`     |
| onSurfaceVariant   | `#424945`     |
| outline            | `#CFE3DA`     |
| elevation.level0   | `transparent` |
| elevation.level1   | `#F3F6F4`     |
| elevation.level2   | `#EDF2EF`     |
| elevation.level3   | `#E6EEE9`     |
| elevation.level4   | `#E0ECE5`     |
| elevation.level5   | `#D9E7E0`     |

#### 4.2.2 樱花浅粉 `sakura`

| 字段               | Hex           |
| ------------------ | ------------- |
| primary            | `#FFB7C5`     |
| onPrimary          | `#3A2A31`     |
| primaryContainer   | `#FFD8E4`     |
| onPrimaryContainer | `#3E001D`     |
| secondary          | `#F8BBD0`     |
| onSecondary        | `#3A2A31`     |
| tertiary           | `#FFE4EC`     |
| background         | `#FFF9FB`     |
| onBackground       | `#3A2A31`     |
| surface            | `#FFFFFF`     |
| onSurface          | `#3A2A31`     |
| surfaceVariant     | `#F2DDE1`     |
| onSurfaceVariant   | `#514347`     |
| outline            | `#F4D8E3`     |
| elevation.level0   | `transparent` |
| elevation.level1   | `#FFF8F9`     |
| elevation.level2   | `#FFF2F5`     |
| elevation.level3   | `#FFEBF0`     |
| elevation.level4   | `#FFE5EB`     |
| elevation.level5   | `#FFDEE7`     |

#### 4.2.3 暗色表面覆盖 `darkSurface`

| 字段             | Hex       |
| ---------------- | --------- |
| background       | `#0B0F14` |
| surface          | `#121722` |
| surfaceVariant   | `#1A2230` |
| onBackground     | `#E6EAF0` |
| onSurface        | `#E6EAF0` |
| onSurfaceVariant | `#C9D1DB` |
| outline          | `#2B3544` |
| outlineVariant   | `#1F2835` |

### 4.3 与现有消费字段的映射（兼容层）

当前业务大量使用 `lightTokens.color.*` 短字段。默认生效的 `color` 对象须同时提供：

| 现有短字段      | 映射自 v3                                                          |
| --------------- | ------------------------------------------------------------------ |
| `brand`         | `primary`                                                          |
| `brandMuted`    | `primaryContainer`                                                 |
| `background`    | `background`                                                       |
| `surface`       | `surface`                                                          |
| `text`          | `onSurface`                                                        |
| `textSecondary` | `onSurfaceVariant`                                                 |
| `border`        | `outline`                                                          |
| `onBrand`       | `onPrimary`                                                        |
| `danger`        | 保留现有 `#C62828`（v3 色板无独立 danger，不删除以免破坏现有用法） |

同时须导出完整 MD3 风格字段（`primary`、`primaryContainer`、`elevation` 等），避免后续切换时再改一遍结构。

### 4.4 模块与导出约定

- 主题色相关代码位于 `apps/nongyu-rn-app/src/theme/`。
- 至少导出：
  - `BrandName` 类型：`'green' | 'sakura'`
  - `brandPalettes`：两套完整品牌色板
  - `darkSurfacePalette`：暗色表面覆盖
  - 默认 token：基于 **green 浅色** 解析出的完整 `ThemeTokens`（含 `space` / `radius` / `fontSize` / `tabBar`）
  - 兼容导出名：`lightTokens` 继续可用，且等于默认川农新绿浅色 token（避免全仓改 import）
- 提供纯函数（建议名 `resolveColorPalette` 或等价）：入参 `brand` + `isDark`，返回合并后的 `color` 对象；本次可仅被默认 token 构建调用，**不**挂 Provider。

### 4.5 默认生效行为

- App 冷启动视觉默认：**川农新绿浅色**。
- 樱花与暗色数据已入库但**不生效**，直至后续设置页接入。
- `StatusBar` 等仍可按浅色处理（本次不随暗色数据变化）。

### 4.6 文档同步

- 更新 `docs/nongyu-rn-app/开发文档.md`：主题 Token 说明改为「已迁入 v3 三套色板数据；切换功能待设置页」。
- 本 Spec 落地后状态改为「已实现（仅色板）」。

---

## 5. 业务流程

本次无用户可见流程。后续设置页接入时预期：

1. 用户选择 brand / 明暗模式
2. Store 持久化偏好
3. 调用与本次相同的 `resolve*` 取色
4. UI 重渲染

本次只完成步骤 3 所需的**色板数据与解析函数**。

---

## 6. 验收标准与测试方案

### 6.1 数据完整性

- [ ] `brandPalettes.green` / `brandPalettes.sakura` 字段与 §4.2.1 / §4.2.2 逐项 Hex 一致。
- [ ] `darkSurfacePalette` 与 §4.2.3 一致。
- [ ] 不存在旧占位主色 `#2E7D32` 作为默认 `brand`/`primary`。

### 6.2 默认视觉

- [ ] 首页、底栏选中色、问候语等使用默认 token 的页面，主色呈现为川农新绿 `#0A7C59`（或由其派生的 `brandMuted` 等）。
- [ ] 背景接近 `#FAFBFA`，卡片表面为白。

### 6.3 兼容与质量门禁

- [ ] 现有 `import { lightTokens } from "@/theme/tokens"` 仍可编译使用。
- [ ] `pnpm --filter nongyu-rn-app type-check` 通过。
- [ ] 仓库级 `pnpm lint` / 格式检查按开发规范通过（改动相关文件）。

### 6.4 明确不验收

- 设置页切换、暗色实际生效、跟随系统、主题偏好持久化。

---

## 7. 修订记录

| 日期       | 说明                                   |
| ---------- | -------------------------------------- |
| 2026-08-12 | 初版：仅迁 v3 配色 Token，切换功能后置 |
| 2026-08-12 | 审查通过并落地色板模块                 |
