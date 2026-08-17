# Spec：AI 空态建议管理（Web Admin）

| 项       | 内容                                                                    |
| -------- | ----------------------------------------------------------------------- |
| 应用     | `apps/nongyu-web-admin`                                                 |
| 需求类型 | **业务**                                                                |
| PRD      | `docs/forhuman/rawprds/nongyu-rn-app/Shell/农屿Agent空态快捷建议PRD.md` |
| 后端契约 | `docs/nongyu-node-server/specs/Agent空态快捷建议配置.md`                |
| 状态     | **已实现**                                                              |
| 日期     | 2026-08-17                                                              |

---

## 1. 背景

需管理端配置 App AI 空态 chip，对齐「首页问候」列表页模式。

## 2. 目标

1. 侧栏「AI 建议」（首页问候之后），路由 `/agent-chat-suggestions`。
2. 列表：分页、启用筛选；列：文案、排序、状态、时间、操作。
3. 新建/编辑：`text`（1～24）、`sortOrder`、`enabled`；启停不互斥；删除确认。

## 3. 边界

- 不拖拽排序；不改 RN/Node 契约以外逻辑。

## 4. 验收

1. 已登录管理员可 CRUD。
2. 空文案/超长前端拦截。
3. 无权限会话提示与其它业务页一致。
