# 实施计划：管理端壳层与智慧助手 UI 对齐

| 项   | 内容                                                        |
| ---- | ----------------------------------------------------------- |
| Spec | `docs/nongyu-web-admin/specs/管理端壳层与智慧助手UI对齐.md` |
| 应用 | `apps/nongyu-web-admin`                                     |
| 状态 | **已完成**                                                  |

---

## 1. 实施计划

一人交付；按步骤顺序落地。不写独立 tech 文档。

| 步骤 | 内容                                                  | 风险 / 缓解                                                |
| ---- | ----------------------------------------------------- | ---------------------------------------------------------- |
| 1    | 壳层偏好读写（`shell-layout` localStorage + clamp）   | 低；对齐现有 `nongyu-admin:v1:*` key 风格                  |
| 2    | 可复用 `ResizeHandle`（拖拽 / 双击复位 / 禁选中）     | 中：pointer capture；注意 Drawer 层叠                      |
| 3    | 改造 `AdminShell`：fixed 左栏、让位、收起图标栏、拖宽 | 中：`inlineCollapsed`；主区偏移同步                        |
| 4    | `AssistantPanel` 可拖宽 + 持久化宽度                  | 低；窄屏全宽优先                                           |
| 5    | 对话壳对齐 RN：MessageList / 输入区交互               | 中：核对 `useAgentChat` 的 `reload`/`stop` 语义            |
| 6    | `useForegroundRefresh` + 各业务页静默接入             | 中：静默路径勿设首屏 loading；Modal 打开时 `enabled=false` |
| 7    | 自测验收 Spec §7；更新 Spec/本计划状态为已实现        | 低                                                         |

**改动面**：仅 `apps/nongyu-web-admin/**` + 本计划 / Spec / PRD 状态。不改 Node、RN、SDK 协议。

**不写**：工具卡片逻辑、Tabs 信息架构、离页保活、快捷键、WebSocket。

---

## 2. 实施步骤

### 2.1 偏好与常量

1. `constants.ts` 增加 `STORAGE_SHELL_LAYOUT_KEY = "nongyu-admin:v1:shell-layout"`
2. 新增 `lib/shellLayoutPrefs.ts`（默认宽、clamp、读写）

### 2.2 ResizeHandle

新增 `components/ResizeHandle.tsx`：`edge` / `value` / `onChange` / `min` / `max` / `defaultValue`；拖拽禁选中；双击复位。

### 2.3 AdminShell

fixed 左栏 + 让位 + 收起图标栏 + 展开可拖宽；窄屏保持抽屉。

### 2.4 AssistantPanel 宽度

桌面可拖宽并持久化；窄屏 `"100%"`。

### 2.5 对话 UI / 交互

MessageList 对齐 RN；输入区可编辑；打断并发送；`reload` 作重试/重新生成。

### 2.6 前台静默刷新

1. 新增 `hooks/useForegroundRefresh.ts`：
   - 监听 `visibilitychange`
   - visible：立即可选 `runOnVisible`，再 `setInterval(60_000)`
   - hidden：clearInterval
   - `enabled` 为 false 时不跑（编辑保护）
   - callback 用 `useEffectEvent` 或 ref，避免陈旧闭包
2. 各业务页接入（静默版 load，不置 `coreLoading=true` 一类首屏旗标）：
   - `DashboardPage`
   - `UsersPage`
   - 内容 `PostListPanel`（或 Content 页）
   - `HomeGreetingsPage`
   - `AgentChatSuggestionsPage`
   - `LlmKeysPage`
   - `LlmProxyFailsPanel`（若独立挂载）
3. 页面在 Modal/编辑 Drawer `open` 时传 `enabled: !modalOpen`
4. **不**接入：Login、Workspace、Versions、AssistantPanel

### 2.7 验收

按 Spec §7（含 §7.4）手工过一遍；通过后 Spec / 本计划状态改为已实现。

---

## 3. 注意事项

- z-index：左栏 &lt; 顶栏遮罩 &lt; 助手 Drawer
- 静默刷新失败不打断用户；与手动「刷新」可共用 fetch，但 loading 策略分叉
- 不引入新依赖
- UI 遵循 `design-system/web-admin/MASTER.md`

---

请与 Spec 一并确认：回复「Spec 与计划通过」后编码。

---

## 4. 完成记录

2026-08-17：已按计划落地壳层 fixed/拖宽/收起、助手拖宽与 RN 对话对齐、`useForegroundRefresh` 业务页接入；`tsc --noEmit` 通过。
