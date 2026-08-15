# 农屿 Agent 生成保活不中断 - 技术方案

| 项        | 内容                                                                      |
| --------- | ------------------------------------------------------------------------- |
| 版本      | v1.0（与已落地实现对齐）                                                  |
| 日期      | 2026-08-15                                                                |
| 需求类型  | 基建（RN Agent 运行时 / AI 页壳层）                                       |
| 关联      | `apps/nongyu-rn-app`（主）；不改 `nongyu-agent-sdk` AgentLoop 并发模型    |
| 上游 Spec | `docs/nongyu-rn-app/specs/农屿Agent生成保活不中断.md`                     |
| 上游 PRD  | `docs/forhuman/rawprds/nongyu-rn-app/Shell/农屿Agent生成保活不中断PRD.md` |
| 实施计划  | `docs/nongyu-rn-app/plans/农屿Agent生成保活不中断.md`                     |
| 状态      | **已落地**（本文档为落地后沉淀，描述 HOW）                                |

---

## 0. 阅读前提

- **WHAT / 边界 / 验收**：以 Spec 为准。
- **本文回答 HOW**：为何用模块级 Runner、如何与会话管理 / AppState / Toast 接线、关键约束与后续演进。
- 修正会话管理 Spec 中「生成中切换先 `stop()`」的行为，改由本方案接管。

---

## 1. 背景与目标

### 1.1 背景

改造前：

| 场景       | 行为                                                        | 问题               |
| ---------- | ----------------------------------------------------------- | ------------------ |
| 离开 `/ai` | `useFocusEffect` 清理调用 `stopAndPersist` → `agent.stop()` | 主动中断生成       |
| 切后台     | 无业务层 abort，但无保活；系统挂起 JS/网络后流易断          | 用户无感知失败原因 |
| 对话状态   | `useAgentChat` 绑在 `AiChatPanel` 生命周期                  | 面板卸载即停消费流 |

现有 `Agent` 单例的 `AgentLoop` 共用一个 `abortController` / `stopped` 标志，**同一时刻只能一路流**。

### 1.2 目标（实现侧）

1. 流式生成状态提升到 **模块级单例 Runner**，不随 AI 页卸载而 `stop`。
2. 轻量感知前后台：不主动 abort；回前台若判定为后台中断则 Toast。
3. 发送互斥、删除/清空/登出仍能可靠停跑与落盘。
4. **零新原生依赖**（不引入前台服务 / Background Fetch 调度任务）。

### 1.3 非目标

- Android 前台常驻通知、iOS BGProcessing 长跑、服务端代跑 Agent。
- 改造 SDK 支持真正多路并行 `stream`。
- 保证杀进程后续跑。

---

## 2. 技术选型

| 领域         | 选型                                                   | 说明                                              |
| ------------ | ------------------------------------------------------ | ------------------------------------------------- |
| 状态归属     | 模块级 `AgentChatRunner` 单例 + `useSyncExternalStore` | 生命周期脱离 React 树；订阅引用稳定               |
| 流消费       | RN 内复刻 `useAgentChat` 的 `agent.stream` 消费逻辑    | 不改 SDK Hook 语义；GUI/Web 仍可用 `useAgentChat` |
| 落盘 / Toast | 根布局 `AgentChatRuntimeHost`                          | AI 页关闭时仍能 complete/stop/error 落盘          |
| 前后台       | `AppState` + `backgroundedDuringRun` 标记              | 轻量尽力；无原生长后台 API                        |
| 发送互斥     | Runner `isBusy` + `matchesView`                        | 受单 Agent 单路流约束                             |
| 工具审批     | 现有全局 `confirm` Promise                             | 离页/后台自然挂起，回前台再点                     |
| 依赖         | **无新增 npm 原生模块**                                | 热更友好                                          |

**不选强保活 / 服务端代跑的理由**：本期 Spec 明确「轻量尽力」；强保活审核与电量成本高；服务端代跑需新基建，超出本切片。

---

## 3. 架构

### 3.1 组件关系

```
app/_layout.tsx
  └── AgentChatRuntimeHost          # 注册 persist / compact / error；install AppState
        └── agentChatRunner (单例)

app/ai.tsx
  └── AiChatPanel
        ├── useAgentChatRunner()    # 订阅 snapshot
        └── useAgentChatRunnerActions()  # send / stop

packages/nongyu-agent-sdk
  └── Agent.stream / Agent.stop     # 仍单路；Runner 唯一消费者
```

### 3.2 目录

```
apps/nongyu-rn-app/src/agent/chatRunner/
  agentChatRunner.ts          # 单例：stream 循环、互斥、endReason
  useAgentChatRunner.ts       # subscribe / actions / bridge
  backgroundKeepAlive.ts      # AppState → 标记 / 回前台 Toast
  AgentChatRuntimeHost.tsx    # 根级落盘与压缩 Toast
  index.ts
```

### 3.3 关键状态

| 字段                               | 含义                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| `runKey`                           | 本次发送时的面板 key（多为 `draft-*` 或 `sess_*`）；**落盘后不升格**，避免当前面板 `isLive` 丢失 |
| `sessionId`                        | 首条落盘后由 `bindSessionId` 写入                                                                |
| `messages` / `isLoading` / `error` | UI 订阅快照                                                                                      |
| `lastEndReason`                    | `complete` \| `stop` \| `error` \| `background-interrupt`                                        |
| `backgroundedDuringRun`            | 生成中曾进入 background/inactive                                                                 |

`matchesView(viewKey, viewSessionId)`：`runKey === viewKey` **或** `sessionId` 等于 viewKey / viewSessionId → 当前面板展示 live 流。

---

## 4. 核心流程

### 4.1 发送

```
用户发送
  → Runner.isBusy 且非 matchesView → Toast「请等待当前回复完成」
  → 否则 agent.stream(prompt, history)
  → 首包落盘 first-user → upsertSession；若新建则 bindSessionId
  → text/tool 事件更新 messages → emit snapshot
  → complete / stop / error → 落盘
```

### 4.2 离页 / 切会话

```
离开 /ai 或切换会话
  → 仅取消 UI 订阅 / remount 另一 viewKey
  → 不调用 agent.stop()
  → Runner 继续；完成仍由 RuntimeHost 落盘
  → 再进入该会话：matchesView → 用 live；否则读 MMKV
```

### 4.3 前后台

```
AppState → background/inactive 且 isBusy
  → markAppBackgrounded()

AppState → active
  → consumeBackgroundInterruptToast()
  → 若上次结束原因为 background-interrupt
       → Toast「应用进入后台后生成已中断，请重试」

流错误时：
  backgroundedDuringRun ? background-interrupt : error
  → background-interrupt 不走「对话失败」Toast（避免后台弹不可见）
```

说明：未申请 iOS `beginBackgroundTask` / Android Foreground Service；「保活」= **不主动停 + 系统短时仍可能跑完**。长挂后台失败属预期，靠 Toast 告知。

### 4.4 主动停止与登出

| 入口                                     | 行为                                             |
| ---------------------------------------- | ------------------------------------------------ |
| AI 页停止按钮                            | `agentChatRunner.stop()` → `agent.stop()` + 落盘 |
| 删除正在生成的会话                       | `stopIfSession(id)` 再删 MMKV                    |
| 清空全部                                 | `reset()`                                        |
| `invalidateNongyuAgent`（登出 / 改配置） | `runner.reset()` + 清 Agent 单例                 |

### 4.5 工具审批

`toolApproval.onApprove` 仍走全局 `confirm`。离页或后台时 Promise 挂起；用户回前台看到弹窗后再决策。不在后台自动拒绝/通过。

---

## 5. 与会话管理的接线

| 点                | 实现要点                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| 落盘时机          | Runner：`first-user` / `complete` / `stop` / `error` → `upsertSession`                                       |
| 新建会话与活跃 id | `bindSessionId`；仅当 `getActiveSessionId() == null` 时 `setActiveSessionId`（避免打断用户已切走的活跃会话） |
| 摘要压缩          | `context:compact` → RuntimeHost Toast + `patchSessionLlmContext`                                             |
| 生成中切换        | **不** stop；旧会话后台跑完落盘（覆盖旧会话管理约定）                                                        |

---

## 6. 实现步骤（回顾）

1. 落地 `AgentChatRunner` + `useSyncExternalStore` 订阅。
2. `AgentChatRuntimeHost` 挂入 `_layout`；`backgroundKeepAlive` 安装一次。
3. `ai.tsx` 去掉离页 `stopAndPersist`；面板按 `matchesView` 选 live / 落盘消息。
4. 删除 / 清空 / `invalidateNongyuAgent` 接入 stop/reset。
5. type-check / format；人工回归 Spec §7。

---

## 7. 风险与注意事项

| 风险                                 | 缓解                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------ |
| 系统杀后台 / 断流                    | 轻量尽力；回前台 Toast；已生成部分尽量落盘                                                 |
| 单路流被误开第二路                   | 发送前 `isBusy` 互斥                                                                       |
| draft `runKey` 与 `sessionId` 不一致 | `matchesView` 双键；**禁止**把 runKey 升格为 sessionId（会导致当前 draft 面板丢失 isLive） |
| Strict Mode 卸载清掉 persist         | bridge **不**在 cleanup 置 null                                                            |
| 后台中断与普通错误                   | `lastEndReason` 分流 Toast 文案                                                            |
| `useAgentChat` 仍存在                | GUI/调试可用；RN AI 页以 Runner 为准，避免双消费者抢同一 Agent                             |

---

## 8. 后续演进（非本期）

- 需要可靠长后台：评估 Android Foreground Service / 服务端代跑 + 推送结果。
- 需要多会话同时生成：改造 SDK `AgentLoop` 每 run 独立 `AbortController`，或多 Agent 实例。
- 可选：短时 `expo` 后台任务 API（仍无法保证流式长连接）。

---

## 9. 文档索引

| 文档                            | 路径                                                  |
| ------------------------------- | ----------------------------------------------------- |
| Spec                            | `docs/nongyu-rn-app/specs/农屿Agent生成保活不中断.md` |
| 计划                            | `docs/nongyu-rn-app/plans/农屿Agent生成保活不中断.md` |
| 会话管理 Spec（行为已交叉修正） | `docs/nongyu-rn-app/specs/农屿Agent会话管理.md`       |
| 代码入口                        | `apps/nongyu-rn-app/src/agent/chatRunner/`            |
