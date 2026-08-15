# 实施计划：农屿 Agent 生成保活不中断

| 项       | 内容                                                          |
| -------- | ------------------------------------------------------------- |
| Spec     | `docs/nongyu-rn-app/specs/农屿Agent生成保活不中断.md`         |
| 技术方案 | `docs/nongyu-rn-app/tech/农屿Agent生成保活不中断-技术方案.md` |
| 状态     | 已落地（待人工回归）                                          |

## 步骤

1. 新增模块级 `AgentChatRunner`（持有 stream / messages / isLoading / sessionKey；subscribe；完成/停止/异常时落盘回调）
2. `AiChatPanel` 改为订阅 Runner；废除离页 `stopAndPersist`
3. 发送互斥：Runner busy 且非当前续写 → Toast「请等待当前回复完成」
4. `AppState` 轻量保活标记 + 回前台异常中断 Toast
5. 删除/清空/登出路径：先 stop Runner
6. 工具审批：confirm 在前台展示（挂起 Promise 即可，现有 confirm 已异步）
7. 同步 Spec 状态；`pnpm lint` / type-check / format（按仓库规范）

## 风险

- 单 Agent 单路流：互斥必须可靠
- 系统仍可能杀后台：仅尽力 + Toast
