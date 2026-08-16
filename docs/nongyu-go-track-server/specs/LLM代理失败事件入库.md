# Spec：LLM 代理失败事件入库（Track）

| 项       | 内容                                                                         |
| -------- | ---------------------------------------------------------------------------- |
| 需求类型 | **基建**                                                                     |
| 主 Spec  | `docs/nongyu-node-server/specs/平台LLM代理失败埋点.md`（真相：触发与 props） |
| 应用     | `apps/nongyu-go-track-server`                                                |
| 状态     | **已实现（待联调）**                                                         |

本服务实现主 Spec §4.3～§4.4：

1. `allowedTypes` 增加 `llm_proxy_fail`。
2. 新增 `POST /v1/internal/events`（Internal Token），按 `user_id` 写入，不触发 presence。
3. 迁移 `002_llm_proxy_fail.sql`：扩展 `events.event_type` CHECK（SQLite 重建表）。
4. 同步更新 `docs/nongyu-go-track-server/接口文档.md`。
