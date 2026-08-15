# 实施计划：教务子页交互与 UI 优化

| 项     | 内容                                               |
| ------ | -------------------------------------------------- |
| Spec   | `docs/nongyu-rn-app/specs/教务子页交互与UI优化.md` |
| 应用   | `apps/nongyu-rn-app`                               |
| 执行者 | `frontend-engineer` subagent + RN skills           |
| 状态   | **已完成编码 · 待人工回归**                        |

---

## 1. 实施计划概览

| 阶段 | 内容                         | 风险                            |
| ---- | ---------------------------- | ------------------------------- |
| A    | 壳层：渐变背景 + 可选搜索条  | 低：改公共壳，需注意空态/加载态 |
| B    | 工具：本地 filter + 进度解析 | 低                              |
| C    | 六列表页接入搜索             | 低：成绩分组需先滤后组          |
| D    | 学业进度条 UI                | 低：解析失败兜底                |
| E    | lint / type-check / format   | —                               |

预估改动面：`JiaowuPageShell` + 可选小工具文件 + 6~7 个 Screen；不改路由与鉴权。

---

## 2. 实施步骤

### 2.1 壳层 `JiaowuPageShell`

1. 根层叠加 `TabScreenBackground`；`root` 背景改为透明（或仅保留兜底色），保证渐变可见。
2. 新增可选 `search?: { value; onChangeText; placeholder }`。
3. 展示条件（按 Spec）：非 `loading`、非 `error`、且调用方传入 `search` 时展示；推荐再加「已成功有数据」由调用方控制是否传 `search`（有数据才传，或始终传由壳内判断——**采用：有原数据时各页才传 `search`，空列表不传**）。
4. 搜索条 UI：顶栏下单行 `TextInput`，`lightTokens` 圆角/描边/间距，`accessibilityLabel` 用 placeholder。
5. 空态：各页自行决定 `empty` / `emptyText`；过滤无结果时传 `emptyText="未找到相关结果"`。

### 2.2 工具函数（新建小文件，避免重复）

路径建议：`src/modules/jiaowu/utils/search.ts`、`parseProgressPercent.ts`

- `matchSearchQuery(query, ...fields: (string | null | undefined)[]): boolean`  
  — trim、toLowerCase、任一字段 includes。
- `parseProgressPercent(progress: string): number | null`  
  — Spec 4.4 规则。

### 2.3 各 Screen

| 文件                                 | 改动                                                        |
| ------------------------------------ | ----------------------------------------------------------- |
| `NoticeScreen` / `CompetitionScreen` | `useState` 关键词；filter `title/date`；有数据时传 `search` |
| `ProgressScreen`                     | filter `type`；卡片加进度条                                 |
| `ScoreScreen`                        | filter 后再 `groupByTerm`                                   |
| `ExamScreen`                         | filter 课程/考场/时间/考核方式                              |
| `PlanScreen`                         | 过滤 `courses`；标题保留；有数据时传 search                 |
| `RankScreen`                         | 仅享受壳层渐变，不传 search                                 |

Placeholder 文案按 Spec 表格。

### 2.4 学业进度条

- 卡片内：`parseProgressPercent(item.progress)` → 成功则轨道 + brand 填充（高度 6–8、圆角）。
- 失败不渲染条；文字进度保留。

### 2.5 校验与收尾

1. 手动对照 Spec §6 验收清单。
2. 在仓库根执行：`pnpm lint`、`pnpm type-check`、`pnpm format`（或按 monorepo 惯例 filter `nongyu-rn-app`）。
3. Spec 状态改为「已实现」；本计划状态改为「已完成」。
4. 若过程中修 Bug，追加 `docs/common/BugLog.md`。

---

## 3. 注意事项

- **复用**：背景必须复用 `TabScreenBackground`，禁止复制一份渐变色值。
- **受控搜索**：关键词状态留在各 Screen，壳只负责展示输入框。
- **成绩分组**：务必先 filter 再 group，避免空学期标题。
- **培养方案**：只过滤课程列表，不因搜索隐藏方案标题（课程全被滤掉时用「未找到相关结果」）。
- **性能**：列表量级为教务单页数据，同步 filter 即可，无需 debounce。
- **专事专干**：编码由 `frontend-engineer` 执行，并加载 RN / frontend-design 相关 skills（按该 agent 提示词）。

---

## 4. 修订记录

| 日期       | 说明                                                                     |
| ---------- | ------------------------------------------------------------------------ |
| 2026-08-14 | 初版待审                                                                 |
| 2026-08-14 | 编码完成，待人工按 Spec §6 回归                                          |
| 2026-08-15 | 增量：`useDeferredLocalSearch`（300+400ms）接入六页；壳层 searching 转圈 |
