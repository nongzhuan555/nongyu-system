# 实施计划：主题配色 Token 迁移

| 项   | 内容                                            |
| ---- | ----------------------------------------------- |
| Spec | `docs/nongyu-rn-app/specs/主题配色Token迁移.md` |
| 应用 | `apps/nongyu-rn-app`                            |
| 状态 | **已完成**                                      |

---

## 1. 实施计划

| 步骤 | 内容                                   | 风险                             |
| ---- | -------------------------------------- | -------------------------------- |
| 1    | 新增色板数据与解析函数                 | 低：纯数据，对照 Spec §4.2       |
| 2    | 重写默认 `tokens` / 兼容 `lightTokens` | 低：短字段映射错误会导致局部色偏 |
| 3    | 同步开发文档与 Spec 状态               | 无                               |
| 4    | type-check / lint / format             | 无                               |

预计改动面：`src/theme/` 少量文件 + 文档；**不改**业务页面结构（仅因默认 token 色值变化而变色）。

---

## 2. 实施步骤

### 2.1 代码

1. 新增 `src/theme/palettes.ts`
   - 导出 `BrandName`、`brandPalettes`（green / sakura）、`darkSurfacePalette`
   - 色值严格按 Spec §4.2
2. 新增 `src/theme/resolveColor.ts`（或同目录等价命名）
   - `resolveColorPalette(brand, isDark)`：浅色用品牌色板；暗色时主色取品牌 `primary/secondary/tertiary`，表面/文字/描边用 `darkSurfacePalette`；并补齐短字段映射 + `danger`
3. 改写 `src/theme/tokens.ts`
   - 保留现有 `space` / `radius` / `fontSize` / `tabBar`
   - `color` = `resolveColorPalette('green', false)`
   - `export const lightTokens = tokens`（兼容现有 import）
   - 导出 `ThemeTokens` 类型
4. 可选：`src/theme/index.ts` 统一再导出（若无则不必强求）

### 2.2 文档

1. Spec 状态改为「已实现（仅色板）」
2. `开发文档.md`：主题 Token 说明改为已迁入 v3 色板、切换待设置页；修订记录补一条

### 2.3 验证

1. `pnpm --filter nongyu-rn-app type-check`
2. 仓库 `pnpm lint` / `pnpm format`（或项目约定的 fmt 命令）
3. 目视：Metro 热更后主色为 `#0A7C59`，背景 `#FAFBFA`

---

## 3. 注意事项

- 不接线 Zustand / MMKV / Appearance；不改设置页。
- 不改动业务组件对 `lightTokens` 的引用方式。
- `danger` 继续用 `#C62828`。
- Hex 统一大写，与 Spec 表一致。

---

## 4. 修订记录

| 日期       | 说明               |
| ---------- | ------------------ |
| 2026-08-12 | 初版               |
| 2026-08-12 | 审查通过并完成编码 |
