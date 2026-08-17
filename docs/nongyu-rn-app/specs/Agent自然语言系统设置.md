# Spec：Agent 自然语言系统设置 Tools

| 项       | 内容                                                                                 |
| -------- | ------------------------------------------------------------------------------------ |
| 应用     | `apps/nongyu-rn-app`                                                                 |
| 需求类型 | **基建**（Agent Tool 能力；设置页 UI 不改）                                          |
| PRD      | `docs/forhuman/rawprds/nongyu-rn-app/MyPage/设置页面PRD.md`                          |
| 复用     | `tool()`（`nongyu-agent-sdk`）、现有 Zustand/MMKV 偏好 Store、`courseTools` 注册方式 |
| 入口     | 农屿 AI 对话；工具挂到 `getOrCreateNongyuAgent`                                      |
| 状态     | **已实现**                                                                           |

---

## 1. 背景

设置能力已分散在设置子页与各 Store（主题、网页跳转、课表 UI 偏好），用户必须手动点进页面。农屿 Agent 已具备教务/二课/课表扩展等 Tool，但**不能**用自然语言改系统偏好。

**Why**：让用户用对话完成已开放的系统设置，降低路径成本。  
**What**：新增聚合读写 Tools，直接调用现有 Store setter，与设置页共用同一持久化源；改完即时生效。

---

## 2. 目标

1. 用户可通过自然语言查询当前系统设置摘要。
2. 用户可通过自然语言修改本 Spec 列出的可写字段；成功后 Agent 用**纯文本**回报变更结果。
3. 读写与设置页共用同一数据源（MMKV / Zustand），无第二套配置。
4. 挂载到现有 Agent；更新 `systemPrompt` 指引何时调用。
5. 跳过独立 tech；本 Spec 确认后编码（可附简短实施清单）。

---

## 3. 边界（非目标）

- 不改设置页 UI / 路由。
- 不做课表**背景图**的查询/清除/更换（选图须系统相册，NL 无法替代；用户明确排除）。
- 不开放农屿 Agent 凭据写操作（API Key / Base URL / 模型）；可读「是否已配置」布尔，不回传 Key。
- 不做「关于与反馈」「是否启用 Agent」等尚未上线项。
- 不做 Generative UI 设置结果卡片（后置）。
- 不同步服务端 `user_settings`（与主题 Spec 一致，后置）。

---

## 4. 详细需求

### 4.1 工具一览

| Tool 名           | 作用                        |
| ----------------- | --------------------------- |
| `settings_get`    | 返回当前可管设置的快照      |
| `settings_update` | 按字段 patch 更新；至少一项 |

### 4.2 `settings_get`

- **输入**：无（或可选 `keys: string[]` 过滤；推荐无参返回全量快照，实现简单）。
- **输出**（JSON 可序列化对象，Agent 再口述）：

| 字段                    | 类型                            | 说明                                      |
| ----------------------- | ------------------------------- | ----------------------------------------- |
| `theme.brand`           | `"green" \| "sakura"`           | 品牌色                                    |
| `theme.appearance`      | `"light" \| "dark" \| "system"` | 外观                                      |
| `web.openWebInApp`      | `boolean`                       | `true`=应用内 WebView；`false`=系统浏览器 |
| `rain.enabled`          | `boolean`                       | 是否允许按校区天气显示下雨特效            |
| `course.cardSize`       | `"sm" \| "md" \| "lg"`          | 课表卡片档                                |
| `course.fontSize`       | `"sm" \| "md" \| "lg"`          | 课表卡片字号档                            |
| `course.semesterStart`  | `string \| null`                | `YYYY-MM-DD` 本地日历日；未设为 `null`    |
| `course.highlightToday` | `boolean`                       | 是否高亮今日列                            |
| `launch.tab`            | `"home" \| "course"`            | 进入主栈默认 Tab                          |
| `agent.configured`      | `boolean`                       | 是否已配置可用模型凭据（不暴露 Key）      |

### 4.3 `settings_update`

- **输入**：对象，**至少提供一个**可写字段（Zod 校验；全空则报错文案）。
- **可写字段**：

| 字段路径               | 类型                            | 落库                                                        |
| ---------------------- | ------------------------------- | ----------------------------------------------------------- |
| `themeBrand`           | `"green" \| "sakura"`           | `useThemePrefsStore.setBrand`                               |
| `themeAppearance`      | `"light" \| "dark" \| "system"` | `useThemePrefsStore.setAppearance`                          |
| `openWebInApp`         | `boolean`                       | `useAppWebPrefsStore.setOpenWebInApp`                       |
| `rainEnabled`          | `boolean`                       | `useRainPrefsStore.setRainEnabled`；切换后刷新校区天气      |
| `courseCardSize`       | `"sm" \| "md" \| "lg"`          | `useCourseUiStore.setCardSize`                              |
| `courseFontSize`       | `"sm" \| "md" \| "lg"`          | `useCourseUiStore.setFontSize`                              |
| `courseSemesterStart`  | `string \| null`                | ISO 日期 `YYYY-MM-DD` 或 `null` 清除；经 `setSemesterStart` |
| `courseHighlightToday` | `boolean`                       | `setHighlightTodayColumn`                                   |
| `launchTab`            | `"home" \| "course"`            | `useAppLaunchPrefsStore.setLaunchTab`                       |

- **禁止字段**：背景图相关；`apiKey` / `baseURL` / `model`。
- **用户确认**：`needsApproval: true`；执行前经 `runConfig.toolApproval.onApprove` 弹出全局确认框（列出拟改项）；取消则工具结果为「已被拒绝」，不落库。
- **输出**：`{ ok: true, updated: string[], snapshot: <同 get 结构> }`；失败 `{ ok: false, error: string }`。
- **副作用**：与设置页相同——主题切换后全 App 跟色；课表/网页偏好即时反映；**不**因本 Tool 调用 `invalidateNongyuAgent`（未改凭据）。

### 4.4 自然语言映射（systemPrompt 指引，非硬编码词典）

示例（验收用）：

| 用户说法                                | 期望                                                       |
| --------------------------------------- | ---------------------------------------------------------- |
| 「现在是什么主题」                      | `settings_get`，口述 brand/appearance                      |
| 「换成樱花主题」「开暗色」「跟随系统」  | `settings_update` 对应字段                                 |
| 「网页用系统浏览器打开」                | `openWebInApp: false`                                      |
| 「打开下雨特效」「关掉下雨」            | `rainEnabled: true` / `false`                              |
| 「课表卡片调大一点」「字号调小」        | `courseCardSize` / `courseFontSize`（大/中/小 ↔ lg/md/sm） |
| 「开学日设为 2026-02-24」「清除开学日」 | `courseSemesterStart`                                      |
| 「不要高亮今天」                        | `courseHighlightToday: false`                              |
| 「首屏设为课表」「打开 App 先看首页」   | `launchTab: course` / `home`                               |
| 「帮我改一下 API Key」                  | **不调用写 Tool**；提示去「设置 → 农屿 Agent」             |

### 4.5 代码落点（实现约束，非 HOW 细节）

- 新建模块如 `src/modules/settings/agent/settingsTools.ts`（或同级），导出 `settingsTools` 对象。
- 在 `src/agent/agent.ts` 的 `tools` 与 `systemPrompt` 中注册与说明。
- 读 Store 用 `getState()`（与 `courseTools` 一致），禁止在 Tool execute 内调 React Hook。
- `semesterStart`：Store 为 `semesterStartMs`；Tool 对外统一 `YYYY-MM-DD` 字符串，内部转换。

### 4.6 错误与校验

- 非法枚举 / 非法日期 → `ok: false` + 可读中文原因。
- 未登录：本轮所列偏好均为设备级、**不依赖登录**（与设置页一致）；`agent.configured` 仅读 SecureStore。

---

## 5. 业务流程

```text
用户自然语言
  → Agent 判定需查/改设置
  → settings_get 或 settings_update
  → 读写 Zustand/MMKV（同设置页）
  → Tool 返回 snapshot / 错误
  → Agent 纯文本回复用户
```

---

## 6. 验收标准

- [x] 「查一下我的主题/网页/课表设置」能拿到与设置页一致的值。
- [x] 改主题 brand/appearance 后 UI 立即跟色；杀进程重进保持。
- [x] 改网页跳转偏好后，首页网站入口行为与设置页一致。
- [x] 改课表 card/font/开学日/高亮后，课表页表现与设置页一致；**不能**通过 Agent 改背景图。
- [x] `settings_update` 执行前弹出确认框；取消则不落库。
- [x] 要求改 API Key 时不写 SecureStore，并引导去设置页。
- [x] `type-check` 通过。

---

## 7. 决策记录（grill）

| 项       | 结论                                                          |
| -------- | ------------------------------------------------------------- |
| 类型     | 基建                                                          |
| 范围     | 已开放：主题、网页、课表（除背景）；Agent 凭据只读 configured |
| 工具     | `settings_get` + `settings_update`                            |
| 写安全   | `settings_update` 须用户确认；凭据不写                        |
| 反馈     | 纯文本                                                        |
| tech     | 跳过                                                          |
| 背景图   | 完全不纳入                                                    |
| 课表其余 | 卡片/字号/开学日/今日高亮均纳入                               |

---

## 8. 修订记录

| 日期       | 说明                                                |
| ---------- | --------------------------------------------------- |
| 2026-08-15 | 初版：grill 全推荐 + 课表除背景均纳入               |
| 2026-08-15 | 实现：settings_get / settings_update + agent 注册   |
| 2026-08-15 | 增补 `launch.tab` / `launchTab`（对齐启动页设置）   |
| 2026-08-15 | `settings_update` 接入 needsApproval + 全局 confirm |
| 2026-08-17 | 增补 `rain.enabled` / `rainEnabled`（下雨特效开关） |
