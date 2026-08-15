# 农屿 Agent 多轮上下文与摘要压缩 - 实施计划

| 项        | 内容                                                                            |
| --------- | ------------------------------------------------------------------------------- |
| 版本      | v0.1（已实施）                                                                  |
| 日期      | 2026-08-15                                                                      |
| 需求类型  | 基建                                                                            |
| 上游 Spec | `docs/nongyu-rn-app/specs/农屿Agent多轮上下文与摘要压缩.md`                     |
| 上游 PRD  | `docs/forhuman/rawprds/nongyu-rn-app/Shell/农屿Agent多轮上下文与摘要压缩PRD.md` |
| 关联      | `packages/nongyu-agent-sdk`（主）+ `apps/nongyu-rn-app`                         |
| 技术方案  | `docs/nongyu-rn-app/tech/农屿Agent多轮上下文与摘要压缩-技术方案.md`             |

---

## 0. 阅读前提

SDD 步骤 4。Spec 已确认。技术方案见 `docs/nongyu-rn-app/tech/农屿Agent多轮上下文与摘要压缩-技术方案.md`。本计划只排落地顺序。

---

## 1. 基线决策

| #   | 事项                     | 采用                                                                                                                       | 说明                                                                                    |
| --- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | 历史注入点               | 每次 `stream`/`complete` 由调用方传入窗口，Loop **按入参重建**，不依赖上次 `resetState` 残留                               | Agent 单例 + 多会话                                                                     |
| 2   | UI→模型映射              | SDK 内纯函数 `chatMessagesToModelMessages`                                                                                 | Hook 与 RN 共用                                                                         |
| 3   | 压缩器                   | 接通并实现 `ContextManager` 的 **hybrid**（默认）                                                                          | 替换 Phase 5 空分支；默认 `maxTokens=28000`、`keepLastNTurns=6`、`compactThreshold=0.8` |
| 4   | 摘要模型                 | `AgentLoop` 持有的同一个 `model.generateText`                                                                              | 无 tools、低 temperature；超时走失败降级                                                |
| 5   | Token                    | 非流式用 `usage.prompt_tokens`；流式请求加 `stream_options.include_usage`，解析最后一包 usage；仍无则 `ceil(chars/4)` 粗估 | 消除现网 `totalTokens += 100` 作为压缩信号                                              |
| 6   | 压缩时机                 | **每个用户回合第一次**模型调用前；本回合后续 tool step 不再 compact                                                        | Spec §5.4                                                                               |
| 7   | 成功/失败通知            | 扩展 `context:compact`；Hook 暴露 `onContextCompact`；RN Toast                                                             | SDK 不依赖 RN toast                                                                     |
| 8   | 落盘                     | `AgentChatSession.llmSummary` + `llmCompactedUntilId`                                                                      | `upsertSession` 保留已有字段，compact 时显式更新                                        |
| 9   | 摘要在 messages 中的形态 | 一条 `role: system` 的「此前对话摘要：…」，紧跟主 systemPrompt 之后                                                        | 不覆盖人设                                                                              |

---

## 2. 范围

### 2.1 本期交付

1. SDK：`AgentInput` 带历史/摘要/游标；Loop 全量注入；hybrid 压缩；compact 事件
2. SDK：`useAgentChat` 把当前 UI 消息映射后传入 `stream`，转发 compact
3. RN：会话类型与仓库读写摘要字段；`ai.tsx` Toast 与 persist
4. 流式 usage 解析（OpenAIProvider）

### 2.2 不做

- 设置页、独立摘要模型、Web Admin
- Tokenizer 库
- 聊天列表系统气泡
- 改会话抽屉 / LRU 配额

---

## 3. 数据与 API 形状（实现用，行为以 Spec 为准）

### 3.1 `AgentInput` 扩展

```ts
interface AgentInput {
  prompt: string;
  /** 本回合之前的 UI 消息（不含本句 prompt、不含空 assistant 占位） */
  history?: ChatMessage[]; // 或已映射的 Message[]；实现选一种，Hook 内映射
  llmSummary?: string;
  llmCompactedUntilId?: string;
}
```

推荐 **Hook 内映射为 `Message[]` 再传入**，Loop 只认 `Message` + summary，避免 Loop 依赖 UI 类型。

### 3.2 compact 事件

扩展现有 `context:compact`：

```ts
{
  agentName: string;
  ok: boolean; // true=摘要成功；false=trim 降级
  beforeTokens: number;
  afterTokens: number;
  llmSummary?: string;
  llmCompactedUntilId?: string;
}
```

流式循环额外 yield 同结构 chunk（`type: "context:compact"`），供 Hook 不订阅 EventBus 也能收到。

### 3.3 会话落盘

`AgentChatSession` 增加可选：

- `llmSummary?: string`
- `llmCompactedUntilId?: string`

`upsertSession`：更新 `messages` 时 **保留** 这两字段，除非调用方传入覆盖。新增 `patchSessionLlmContext(studentId, sessionId, { llmSummary, llmCompactedUntilId })` 专写压缩结果。

窗口构建：若有 `llmCompactedUntilId`，只把该 id **之后** 的 UI 消息映射进模型；摘要走 `llmSummary`。id 找不到则当无游标（全量 + 摘要仍带，避免丢摘要）。

---

## 4. 核心算法（Loop 每回合）

```
mapped = map(history) 过滤 pending/欢迎语/空错误气泡
window = sliceAfter(mapped, compactedUntilId)
messages = [user(prompt)] 前置 window
if (shouldCompact(lastPromptTokens) && userTurns(window) > 6):
  old, tail = splitKeepLastNUserTurns(window, 6)
  try:
    summary = generateSummary(prevSummary, old)  // 同一 model，无 tools
    emit compact ok
  catch:
    summary = undefined  // 不落失败摘要；游标仍推进到 old 末条
    emit compact fail
  window = tail
  persist cursor = last id of old (对应 UI 消息 id：map 时保留源 id)
messagesForModel = systemPrompt + optional summary system + window + 本句
然后进入现有 tool loop（本回合不再 compact）
结束后用本回合 usage 更新 lastPromptTokens（写入 ContextManager 或 Loop 字段）
```

摘要 prompt 约束（实现写死）：中文；保留事实与用户约束；禁止复述超长工具 JSON；输出纯文本摘要。

`generateSummary` 须设超时（建议 20s）与 `max_tokens` 上限（建议 800），失败进 catch。

---

## 5. 实施步骤

### 步骤 A — SDK 类型与映射

- `types/agent.ts`：`AgentInput`、默认 `ContextConfig`
- `types/events.ts` + `types/stream.ts`：compact payload
- 新增 `core/context/chatToModel.ts`：`ChatMessage[]` → `Message[]`（展开 toolCalls）
- `core/context/strategies/hybrid.ts`：split + 调用摘要（或放在 ContextManagerImpl.compact）
- 默认常量：`28000 / 0.8 / 6`

### 步骤 B — ContextManager 真正 hybrid

- `compact()` 实现 summarization/hybrid，去掉 Phase 5 空注释
- Trimming 仍用于「切出近 6 轮」
- `addMessage` / `clear` / 按入参 `hydrate` 一次回合窗口

### 步骤 C — AgentLoop + AgentImpl

- `buildInitialMessages(input)`：history + prompt，不再单条 prompt
- `run` / `runStream` 回合开始：hydrate → maybe compact（仅 step 1 前）→ 再调模型
- 停止在 `resetState` 时丢掉「跨回合消息」，但 **保留 lastPromptTokens** 在 ContextManager 内；**每个 input 都 hydrate**，单例串会话由入参隔离
- `createAgent`：实例化 ContextManager（config.context 可覆盖默认）

### 步骤 D — OpenAIProvider 流式 usage

- `stream: true` 时加 `stream_options: { include_usage: true }`（兼容不支持的网关：忽略未知字段）
- 解析 chunk 上的 `usage`，通过 `StreamDelta` 带出；Loop 累加 `prompt_tokens`

### 步骤 E — useAgentChat

- `runStream` 在 `setMessages` 追加本句之前，用 **当前 prev** 作 history（`reload` 先裁掉最后 assistant 再取）
- `agent.stream({ prompt, history: mapped, llmSummary, llmCompactedUntilId })`
- 配置增加 `llmSummary` / `llmCompactedUntilId` / `onContextCompact`
- 处理 `context:compact` chunk，回调调用方

### 步骤 F — RN

- `session/types.ts` + `repository.ts`：字段、patch、upsert 保留
- `AiChatPanel`：从当前 session 把 summary/游标传入 hook；`onContextCompact` → toast + `patchSessionLlmContext`
- 草稿首条创建会话后，compact 若发生在首回合极少见；若 sessionId 刚创建，patch 用 `sessionIdRef`
- 成功文案 / 失败文案严格按 Spec

### 步骤 G — 校验

- `pnpm lint` / `type-check` / `format`（至少 SDK + rn-app）
- 按 Spec §7 手工清单自测（短续聊、切会话、Toast 一次）

---

## 6. 文件清单（预计）

| 路径                                                              | 动作                                           |
| ----------------------------------------------------------------- | ---------------------------------------------- |
| `packages/nongyu-agent-sdk/src/types/agent.ts`                    | 改                                             |
| `packages/nongyu-agent-sdk/src/types/events.ts`                   | 改                                             |
| `packages/nongyu-agent-sdk/src/types/stream.ts`                   | 改                                             |
| `packages/nongyu-agent-sdk/src/types/model.ts`                    | 改（StreamDelta.usage）                        |
| `packages/nongyu-agent-sdk/src/core/context/index.ts`             | 改                                             |
| `packages/nongyu-agent-sdk/src/core/context/chatToModel.ts`       | 新增                                           |
| `packages/nongyu-agent-sdk/src/core/context/strategies/hybrid.ts` | 新增（若未并入 index）                         |
| `packages/nongyu-agent-sdk/src/core/agent/loop/index.ts`          | 改                                             |
| `packages/nongyu-agent-sdk/src/core/agent/index.ts`               | 改                                             |
| `packages/nongyu-agent-sdk/src/core/model/openai.ts`              | 改                                             |
| `packages/nongyu-agent-sdk/src/hooks/useAgentChat.ts`             | 改                                             |
| `packages/nongyu-agent-sdk/src/hooks/types.ts`                    | 改                                             |
| `apps/nongyu-rn-app/src/agent/session/types.ts`                   | 改                                             |
| `apps/nongyu-rn-app/src/agent/session/repository.ts`              | 改                                             |
| `apps/nongyu-rn-app/app/ai.tsx`                                   | 改                                             |
| `packages/nongyu-agent-sdk/TECH-DESIGN.md`                        | 可选：默认 8000 → 注明 RN 默认 28000（非必须） |

---

## 7. 风险

| 风险                             | 对策                                               |
| -------------------------------- | -------------------------------------------------- |
| 网关不返回流式 usage             | 字符粗估兜底，可能偏早/偏晚压缩，可接受            |
| 摘要再耗一轮 token/延迟          | 压缩在回复前，用户感到多等几秒；Timeout 20s        |
| tool_call_id 缺失导致厂商拒请求  | 映射时无 id 的 tool 结果跳过或补占位，并在注释标明 |
| compact 游标 id 对不上（旧数据） | 找不到则全量 + 仍带 summary                        |
| `debug: true` 日志变长           | 不在本期关 debug；注意勿打满 apiKey                |

---

## 8. 验收对照

以 Spec §7 清单为准。计划完成定义：A–F 合入、lint/type-check 过、§7.1 至少「我叫小明」续聊与切会话隔离可在真机/模拟器点过。

---

审查请直接回复：**计划通过** / 要改的条目。通过后按 A→G 编码。
