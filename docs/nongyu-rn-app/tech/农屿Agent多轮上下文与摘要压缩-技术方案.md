# 农屿 Agent 多轮上下文与摘要压缩 - 技术方案

| 项        | 内容                                                                                      |
| --------- | ----------------------------------------------------------------------------------------- |
| 版本      | v1.0（与现网实现对齐）                                                                    |
| 日期      | 2026-08-15                                                                                |
| 需求类型  | 基建                                                                                      |
| 关联      | `packages/nongyu-agent-sdk`、`apps/nongyu-rn-app`                                         |
| 上游 Spec | `docs/nongyu-rn-app/specs/农屿Agent多轮上下文与摘要压缩.md`                               |
| 上游计划  | `docs/nongyu-rn-app/plans/农屿Agent多轮上下文与摘要压缩-实施计划.md`                      |
| 相关      | SDK 总设计 `packages/nongyu-agent-sdk/TECH-DESIGN.md` §5（默认 8000 以本方案 28000 为准） |

---

## 0. 阅读前提

本文回答 **HOW**：如何把整段会话注入大模型，以及超长时如何 hybrid 摘要压缩。WHAT 与验收以 Spec 为准。

实现已落地；本文是对现网代码的技术留档，供后续改阈值、换策略或排障使用。

---

## 1. 技术选型

| 领域      | 选型                                                                                    | 说明                                                                                |
| --------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 历史来源  | 每次请求由调用方传入 `history`，Loop **按入参重建**                                     | Agent 是进程单例，不能靠 `resetState` 残留跨会话                                    |
| UI → 模型 | `chatMessagesToModelMessages`                                                           | `ChatMessage` 只有 user/assistant，工具在 `toolCalls` 上，需展开为 assistant + tool |
| 压缩策略  | **hybrid**：旧段 LLM 摘要 + 最近 6 个 user 轮原文                                       | 对齐 Spec；不做纯 trim（会丢早期约束）                                              |
| 摘要模型  | 与对话同一 `OpenAIProvider`                                                             | 无 tools、`temperature=0.2`、`max_tokens=800`、超时 20s                             |
| Token     | 优先 `usage.prompt_tokens`；流式加 `stream_options.include_usage`；否则 `ceil(chars/4)` | SDK 不引入 tokenizer                                                                |
| 默认窗口  | `maxTokens=28000`，`compactThreshold=0.8`（≥22400 触发），`keepLastNTurns=6`            | 不进设置页；`createAgent({ context })` 可覆盖                                       |
| 通知      | SDK `context:compact` 事件 + 流式 chunk；RN `onContextCompact` → 全局 `toast`           | SDK 不依赖 RN                                                                       |
| 落盘      | 会话字段 `llmSummary` + `llmCompactedUntilId`                                           | UI `messages` 仍为完整气泡，压缩只切模型窗口                                        |

**不选** 独立摘要模型、本地 tokenizer、把压缩结果写进聊天气泡。

---

## 2. 运行时数据流

```
AiChatPanel (session.llmSummary / llmCompactedUntilId)
    → useAgentChat.runStream
        1. 快照当前 UI messages（不含本句将插入的空 assistant）
        2. chatMessagesToModelMessages(snapshot)
        3. agent.stream({ prompt, history, llmSummary, llmCompactedUntilId })
    → AgentLoop.prepareTurn → prepareConversationWindow
        切片游标 → 估 token → 必要时 hybrid
    → 第一次模型调用：systemPrompt + 可选「此前对话摘要」system + 窗口 + 本句
    → 本回合后续 tool step 不再 compact
    → yield context:compact（若发生）
    → RN Toast + patchSessionLlmContext
```

会话隔离：切会话 `key` remount `AiChatPanel`；每回合 history 来自该面板的 UI 状态 + 该会话落盘字段，不读上一会话的 Loop 内存。

---

## 3. 关键模块

### 3.1 映射（`core/context/chatToModel.ts`）

| UI                       | 模型 Message                                                                      |
| ------------------------ | --------------------------------------------------------------------------------- |
| user                     | `role: user`，`id` 沿用 UI id                                                     |
| assistant 无工具         | `role: assistant`                                                                 |
| assistant 有 `toolCalls` | assistant（含 OpenAI `tool_calls`）+ 每条 `role: tool`（`tool_call_id` / `name`） |

排除：`welcome-` 前缀、空 pending assistant、无正文且无工具的 error 气泡。  
缺 `callId` 时补 `call_${chatId}_${index}`，避免部分厂商拒请求。  
展开出的 tool 消息 **复用所属 assistant 的 id**，压缩游标才能对齐 UI。

### 3.2 组窗口（`core/context/prepareWindow.ts`）

1. `sliceAfterCompactedId(history, llmCompactedUntilId)`：切掉已压缩前缀；游标找不到则当无游标（全量 + 仍带摘要）。
2. 估算：摘要 + 窗口 + 本句 `prompt` 的字符 / 4；或入参 `lastPromptTokens`（现网 Hook 未传，以估算为主）。
3. 触发：`estimated >= 28000 * 0.8` **且** 窗口内 user 轮次 **> 6**。
4. 用既有 `TrimmingStrategy` 切出近 6 轮为 `tail`，其余为 `old`。
5. 成功：`generateText` 摘要（输入 = 已有摘要 + old 的截断转写）；窗口 = 摘要 system 消息 + tail + 本句 user。
6. 失败/空/超时：本轮窗口 = tail + 本句（**不带**摘要）；`ok: false`。

摘要 system 文案前缀：`此前对话摘要：\n…`，插在 **主 `systemPrompt` 之后**（`AgentLoop.toModelMessages`）。

常量见 `core/context/defaults.ts`。

### 3.3 Loop（`core/agent/loop/index.ts`）

- `run` / `runStream` 开头 `prepareTurn` **一次**。
- 压缩结果：`events.emit("context:compact")`；流式再 `yield { type: "context:compact", ... }`。
- 流式 usage：解析末包 `usage`；没有则对当前窗口粗估累加（不再 `+= 100`）。

`AgentImpl` 把 `config.context` 传入 Loop。RN `createAgent` 不传则走上述默认。

### 3.4 流式 usage（`core/model/openai.ts`）

`stream: true` 时带 `stream_options: { include_usage: true }`。网关若不支持该字段，可能整段流失败——届时需降级去掉该选项（已知风险）。

### 3.5 Hook（`hooks/useAgentChat.ts`）

配置：`llmSummary`、`llmCompactedUntilId`、`onContextCompact`。  
`reload`：若最后一条 user 与当前 `prompt` 相同，映射历史时去掉该条，避免与本句重复。

### 3.6 RN 会话仓

`AgentChatSession` 增加可选：

- `llmSummary`
- `llmCompactedUntilId`

`upsertSession` 只更新 `messages` 时 **保留** 这两字段。  
`patchSessionLlmContext`：成功写摘要+游标；失败清 `llmSummary`、仍推进游标。  
草稿尚无 `sessionId` 时 compact 结果先放 `pendingCompactRef`，首条落盘后再 patch。

Toast（`toast.info`）：

- 成功：「当前会话过长，已做摘要压缩」
- 失败：「会话过长，摘要失败，已仅保留最近对话」

同一用户回合只可能 compact 一次，故不会连弹多次。

---

## 4. 发给模型的 messages 顺序

1. Agent `systemPrompt`（人设 + 工具约束）
2. 若有有效摘要：`system`「此前对话摘要：…」
3. 游标之后的 user / assistant / tool（时间序）
4. 本轮 user `prompt`
5. 本回合 loop 中新产生的 assistant `tool_calls` 与 tool 结果

---

## 5. 实现步骤（已完成，备查）

1. 类型：`AgentInput.history/llmSummary/llmCompactedUntilId`；扩展 `context:compact` 与 `AgentStreamChunk`。
2. `chatToModel` + `prepareConversationWindow` + 默认常量。
3. Loop / AgentImpl 接通；OpenAI 流式 usage。
4. `useAgentChat` 传历史并转发 compact。
5. RN 类型、仓库、`ai.tsx` Toast 与落盘。
6. `pnpm --filter nongyu-agent-sdk build`（RN 消费 `dist` 类型）。

---

## 6. 注意事项

| 项                    | 说明                                                                        |
| --------------------- | --------------------------------------------------------------------------- |
| 改 SDK 后必须 rebuild | RN 走 `nongyu-agent-sdk` 的 `dist/`，只改 `src` Metro 不会自动拿到类型/实现 |
| 压缩不删 UI           | 用户仍可滚到最早气泡；模型侧不再看到游标前的原文 JSON                       |
| 再次压缩              | 摘要输入 = 旧摘要 + 新裁掉的那段，不是整份 UI 历史                          |
| 估算偏差              | 无 tokenizer 时可能偏早/偏晚压缩，可接受                                    |
| 单例 Agent            | 禁止在 Loop 内缓存「上一会话」messages；必须每回合 hydrate                  |
| 安全                  | 摘要请求无 tools，避免摘要模型乱调教务工具                                  |

---

## 7. 排障

| 现象                   | 优先查                                                                  |
| ---------------------- | ----------------------------------------------------------------------- |
| 下一句完全不记得上一句 | Hook 是否把 `history` 传入；是否仍在用旧 `dist`                         |
| 切会话串话             | `AiChatPanel` 的 `key` 是否随 `sessionId` remount；落盘摘要是否写错会话 |
| 一发消息就 Toast 压缩  | 估算是否把 systemPrompt 算进窗口过大；user 轮是否真的 > 6               |
| 流式整段失败           | 网关是否拒绝 `stream_options`                                           |
| 压缩后仍爆 token       | 工具结果在近 6 轮内仍然很大——需另开「截断 tool output」需求             |
