# Spec：农屿 Agent 交互优化（重试 / 打断 / 重新生成）

| 项       | 内容                                                                            |
| -------- | ------------------------------------------------------------------------------- |
| 应用     | `apps/nongyu-rn-app`（主）；`packages/nongyu-agent-sdk`（`ChatMessage.status`） |
| 需求类型 | **基建**                                                                        |
| PRD      | `docs/forhuman/rawprds/nongyu-rn-app/Shell/农屿Agent交互优化PRD.md`             |
| 入口     | `/ai` 对话页：输入栏、assistant 消息操作条、Runner 发送 / 停止流                |
| 关联     | 农屿 Agent 生成保活不中断、会话管理、`agentChatRunner`                          |
| 状态     | **已落地（待人工回归）**                                                        |
| 技术方案 | 本期跳过                                                                        |

---

## 1. 背景

**Why**：失败 / 打断后只能手动再打一遍问题；生成中输入锁定；停止后状态不清晰，与主流 AI 助手差距明显。  
**What**：补齐「重试」「重新生成」「已停止」语义，打磨停止与「打断并发送」交互。

---

## 2. 目标

1. 失败（`error`）、用户停止（`stopped`）、空回复：最近一条 assistant 可「重试」。
2. 正常完成（`done` 且非空）：最近一条 assistant 可「重新生成」。
3. 用户点停止：保留已生成正文，消息标为 `stopped`，文案标注「已停止」。
4. 生成中输入框可编辑；点发送 = 先 `stop` 再立即发送新 prompt。
5. 输入栏 Stop 在流式文本与工具执行期间均可打断。

> **修订（2026-08-15）**：生成中输入锁定与「打断并发送」已由 `specs/农屿Agent中断确认.md` 覆盖——`isLoading` 时禁用输入，仅保留带确认的 Stop；上表第 4 点不再作为现行行为。

---

## 3. 边界（非目标）

- 编辑历史 user 并从中间截断重跑
- 复制消息、长按菜单、追问 suggestion chips
- 网络失败自动静默重试
- 多路并行生成；改变「他会话发送仍 busy 拦截」规则（仍遵循保活 Spec）
- 独立技术方案文档

---

## 4. Grill 共识

| 决策         | 结论                                                                    |
| ------------ | ----------------------------------------------------------------------- |
| 归类         | 基建                                                                    |
| 本期范围     | 重试 + Stop 打磨 + 重新生成 + 错误/停止操作条 + 已停止；二期不做        |
| 重试 vs 重生 | error / stopped / 空回复 →「重试」；成功完成 →「重新生成」              |
| 历史处理     | 去掉目标 assistant，**不**重复插 user，再生成新 assistant               |
| 生成中再发送 | 先 stop，再立刻用新内容 `send`                                          |
| 操作入口     | **仅**最近一条 assistant 下方操作条；user 气泡不放按钮                  |
| 停止状态     | 新增 `ChatMessage.status: "stopped"`                                    |
| 空回复       | `done` + content trim 空 + 无 `status === "done"` 的 tool 结果 → 可重试 |
| tech 文档    | 跳过                                                                    |

---

## 5. 详细需求

### 5.1 消息状态扩展

`ChatMessage.status` 扩展为：

`"pending" | "streaming" | "done" | "error" | "stopped"`

| status    | 含义                       | 落盘 |
| --------- | -------------------------- | ---- |
| `stopped` | 用户主动停止，可含部分正文 | 是   |
| `error`   | 生成失败                   | 是   |
| `done`    | 正常完成（含空回复边界）   | 是   |

用户点 Stop / AbortError 路径：assistant 最终状态为 **`stopped`**（不再标成 `done`）。  
后台异常中断仍为 `error`（保活 Spec Toast 文案不变）。

### 5.2 操作条（仅最近一条 assistant）

当且仅当：

- 当前会话/草稿为「直播」或静态历史中的**最后一条**消息为 assistant；
- 且 Runner **未**在 `isLoading`；

则在该条下方展示操作条：

| 条件                              | 主按钮文案   | 行为                                     |
| --------------------------------- | ------------ | ---------------------------------------- |
| `error` 或 `stopped` 或「空回复」 | **重试**     | §5.3 retry（无确认）                     |
| `done` 且非空回复                 | **重新生成** | §5.3 regen；**须先弹确认窗**，确认后执行 |

- 「空回复」：`status === "done"` 且 `content.trim() === ""` 且不存在 `toolCalls` 中 `status === "done"` 的项。
- 历史中更早的 assistant **不**展示操作条。
- 生成中（`pending` / `streaming`）不展示操作条；停止入口仅输入栏 Stop。
- 「重新生成」确认窗：标题「重新生成」、说明当前回复将被替换、确认/取消；取消则不改动。

### 5.3 retry / regenerate 行为

统一算法 `regenerateLastAssistant()`：

1. 取当前消息列表；若最后一条不是 assistant，或正在 loading → 忽略。
2. 向前找**紧邻**的上一条 user；若不存在 → 忽略。
3. 令 `historyMessages` = 去掉该 assistant 后的列表（保留该 user 及之前全部）。
4. 以该 user 的 `content` 为 `prompt`，调用 Runner 等价于 `send`，但：
   - **不得**再向列表追加一条新的 user 消息；
   - 仅追加新的 pending assistant 并流式更新（实现上可为 `send` 的变体，如 `regenerate({ prompt, historyMessages })`，其中 `historyMessages` 已含原 user）。

语义对照：

- UI「重试」与「重新生成」均调用同一算法；差异仅在按钮文案与出现条件。

### 5.4 停止（Stop）

- 输入栏在 `isLoading` 时展示 Stop（现有能力保留）。
- `stop()` 后：
  - 刷出已缓冲正文；
  - assistant `status = "stopped"`；
  - `lastEndReason = "stop"`；
  - 落盘 `reason: "stop"`。
- 工具执行中 Stop 必须仍能打断（现有 `agent.stop()` / AbortSignal 路径保持有效）。

### 5.5 输入栏：生成中可编辑 + 打断并发送

- `TextInput`：**生成中仍可编辑**（去掉 `editable={!isLoading}` 限制）。
- `isLoading` 时右侧仍为 Stop；**非** loading 且有内容时为发送。
- 若用户在 `isLoading` 时希望发新问题：
  - **本期约定**：不提供「发送与 Stop 同时可见」的双按钮；用户须先点 Stop，再点发送；**或**
  - **推荐实现**：loading 时若输入非空，右侧可切换为「发送」形态，点按 = `stop()` 后立即 `send(新内容)`（打断并发送）。
  - **本 Spec 采用后者**：`isLoading && input.trim()` 时右侧按钮为发送（打断并发送）；`isLoading && !input.trim()` 时为 Stop。

| 状态                   | 右侧按钮      | 行为                 |
| ---------------------- | ------------- | -------------------- |
| 非 loading，input 空   | 发送 disabled | —                    |
| 非 loading，input 非空 | 发送          | `send`               |
| loading，input 空      | Stop          | `stop`               |
| loading，input 非空    | 发送          | `stop` 后立刻 `send` |

他会话 busy 拦截规则不变：Toast「请等待当前回复完成」。

### 5.6 展示

- `stopped`：正文按完成态渲染（可用 Markdown）；下方灰色小字「已停止」；操作条「重试」。
- `error`：保留错误文案；操作条「重试」。
- 空回复 `done`：可无正文；操作条「重试」。

### 5.7 与保活 / 会话管理关系

| 既有约定                  | 本期                                 |
| ------------------------- | ------------------------------------ |
| 他会话发送 busy 拦截      | 不变                                 |
| 离页不 stop               | 不变                                 |
| 后台中断 Toast「…请重试」 | 不变；Toast 后用户可点操作条「重试」 |
| 删除会话 / 登出仍 stop    | 不变                                 |

---

## 6. 业务流程

### 6.1 重试 / 重新生成

```
用户点击「重试」或「重新生成」
  → 校验：非 loading 且最后一条为 assistant 且存在紧邻 user
  → messages' = messages.slice(0, -1)   // 去掉该 assistant，保留 user
  → Runner.regenerate(prompt=user.content, historyMessages=messages')
  → 追加新 assistant(pending) → 流式 → done | error | stopped
  → 落盘
```

### 6.2 打断并发送

```
生成中，用户输入新文本并点发送
  → stop()（当前 assistant → stopped，落盘）
  → send(新 prompt，history=当前含 stopped 的列表)
  → 新 user + 新 assistant …
```

### 6.3 仅停止

```
生成中，input 空，点 Stop
  → assistant → stopped +「已停止」+ 可「重试」
```

---

## 7. 验收标准与测试方案

### 7.1 UI / 操作

| #   | 场景                        | 期望                                                            |
| --- | --------------------------- | --------------------------------------------------------------- |
| 1   | 制造 API/网络失败           | assistant=`error`；操作条「重试」；点后不新增 user，重新流式    |
| 2   | 生成中点 Stop（input 空）   | `stopped` +「已停止」+「重试」；已出字保留                      |
| 3   | 空回复（无正文无成功 tool） | 「重试」可见且可用                                              |
| 4   | 正常完成非空                | 「重新生成」；点后旧 assistant 消失并重新生成                   |
| 5   | 生成中输入文字点发送        | 旧条变 stopped；新 user+assistant 开始；不 Toast busy（本会话） |
| 6   | 生成中无输入                | 仅 Stop；可打断工具执行中的请求                                 |
| 7   | 历史非最后一条 assistant    | 无操作条                                                        |
| 8   | 他会话生成中在本会话发送    | 仍 Toast「请等待当前回复完成」                                  |

### 7.2 回归

- 保活：离页 / 切后台不因本期改动而主动 stop。
- 会话落盘：stop / error / complete / regenerate 后重进会话内容一致。

---

## 8. 实现触达面（指引，非 HOW 细节）

- `nongyu-agent-sdk`：`ChatMessage.status` 增加 `stopped`
- `agentChatRunner`：`stop` 写 `stopped`；新增 `regenerate`（或等价 send 变体）
- `app/ai.tsx`：输入栏按钮状态机（§5.5）；接线 regenerate
- `AssistantMessage` / `MessageList`：操作条 +「已停止」文案
