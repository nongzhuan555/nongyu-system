# 实施计划：农屿 Agent 交互优化

| 项       | 内容                                            |
| -------- | ----------------------------------------------- |
| Spec     | `docs/nongyu-rn-app/specs/农屿Agent交互优化.md` |
| 技术方案 | 本期跳过                                        |
| 状态     | 已落地（待人工回归）                            |

## 步骤

1. SDK `ChatMessage.status` 增加 `stopped`
2. `agentChatRunner`：`finishAssistantAsStopped`；Abort/stop 路径写 `stopped`；新增 `regenerate`（`reuseLastUser`，不追加 user）
3. `useAgentChatRunnerActions` 暴露 `regenerate`
4. `AssistantMessage` / `MessageList`：最近一条操作条（重试/重新生成）+「已停止」
5. `AiChatPanel`：输入栏状态机（Stop / 打断并发送）；接线 regenerate
6. 更新 Spec 状态为已落地

## 风险

- stop 与 `runStream` finally/Abort 竞态：以 `userStopped` + `stopped` 状态为准，避免被改回 `done`
- regenerate 勿触发草稿「首条建会话」误逻辑：已有 session 时 persist 用合适 reason
