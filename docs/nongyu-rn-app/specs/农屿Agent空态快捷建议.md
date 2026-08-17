# Spec：农屿 Agent 空态快捷建议（RN）

| 项       | 内容                                                                    |
| -------- | ----------------------------------------------------------------------- |
| 应用     | `apps/nongyu-rn-app`                                                    |
| 需求类型 | **业务**                                                                |
| PRD      | `docs/forhuman/rawprds/nongyu-rn-app/Shell/农屿Agent空态快捷建议PRD.md` |
| 后端契约 | `docs/nongyu-node-server/specs/Agent空态快捷建议配置.md`                |
| 状态     | **已实现**                                                              |
| 日期     | 2026-08-17                                                              |

---

## 1. 背景

`ChatEmptyState` 的 `SUGGESTIONS` 写死；改为后端运营配置。

## 2. 目标

1. 登录后拉 `GET /api/app/agent/chat-suggestions`。
2. 问候标题/副标题立即本地渲染；chip 区 loading 显示骨架。
3. 失败 / 未登录 / `items` 空 → 本地 4 条兜底。
4. 点选仍走 `onSuggestion(text)`。

## 3. 边界

- 不配标题/副标题；不改发送链路；不做 Admin。

## 4. 详细需求

### 4.1 本地兜底

```ts
["查一下我的成绩", "本周有哪些二课活动", "看看我的课表", "帮我改成深色主题"];
```

### 4.2 拉取

- App JWT；`staleTime` 约 60s；进入空态时请求（可 React Query）。
- 成功且 `items.length > 0`：用远程 `text`（服务端已限 6）。
- 否则兜底。

### 4.3 UI

- loading：chip 区约 4 条骨架，问候不动。
- 就绪后渲染 chip；样式沿用现有。

## 5. 验收

1. 有运营数据时 chip 与后台一致。
2. 断网仍有本地 4 条。
3. 点选仍发起对话。
