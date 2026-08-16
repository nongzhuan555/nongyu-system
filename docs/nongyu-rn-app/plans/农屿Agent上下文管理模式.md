# 实施计划：农屿 Agent 上下文管理模式

| 项   | 内容                                                  |
| ---- | ----------------------------------------------------- |
| Spec | `docs/nongyu-rn-app/specs/农屿Agent上下文管理模式.md` |
| 状态 | 已落地（待人工回归）                                  |

## 步骤

1. MMKV key + `agentContextPrefsStore`（默认 `full`）
2. `AgentSettingsScreen` 增加上下文管理单选 + 说明
3. `agentChatRunner.runStream`：`stateless` 时 stream 不带 history/摘要
4. Spec 标已落地

## 风险

- 无记忆仅裁剪模型入参，勿误清空 UI messages
