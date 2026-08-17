# Spec：Agent 空态快捷建议配置（Node）

| 项        | 内容                                                                    |
| --------- | ----------------------------------------------------------------------- |
| 应用      | `apps/nongyu-node-server`                                               |
| 需求类型  | **业务**                                                                |
| PRD       | `docs/forhuman/rawprds/nongyu-rn-app/Shell/农屿Agent空态快捷建议PRD.md` |
| 配套 Spec | RN / Web Admin 同名                                                     |
| 状态      | **已实现**                                                              |
| 日期      | 2026-08-17                                                              |

---

## 1. 背景

RN AI 空态 chip 需可运营配置。本期提供表、Admin CRUD、App 只读列表。

## 2. 目标

1. 持久化多条建议；可同时多条 `enabled`；按 `sort_order` 排序。
2. Admin CRUD；App 拉启用列表（最多 6 条）。
3. 迁移 seed 当前 4 条默认文案并启用。
4. 关键测试覆盖。

## 3. 边界

- Web Admin / RN UI 见配套 Spec。
- 不做互斥单条启用、个性化、富字段。

## 4. Grill 共识

| 决策     | 结论                       |
| -------- | -------------------------- |
| 启用     | 可多条同时启用             |
| App 鉴权 | App JWT                    |
| 文案     | trim 后 1～24 字           |
| App 条数 | 启用项按序取前 6           |
| Seed     | 4 条当前本地文案，全部启用 |

## 5. 详细需求

### 5.1 表 `agent_chat_suggestions`

| 列           | 类型                       | 说明       |
| ------------ | -------------------------- | ---------- |
| `id`         | BIGINT AI PK               |            |
| `text`       | VARCHAR(24) NOT NULL       | 建议正文   |
| `enabled`    | TINYINT NOT NULL DEFAULT 0 | 1/0        |
| `sort_order` | INT NOT NULL DEFAULT 0     | 越小越靠前 |
| `created_at` | DATETIME(3)                |            |
| `updated_at` | DATETIME(3)                |            |

索引：`KEY idx_agent_chat_suggestions_enabled_sort (enabled, sort_order, id)`  
迁移：`009_agent_chat_suggestions.sql`

### 5.2 App API

`GET /api/app/agent/chat-suggestions`（`requireAppAuth`）

成功：

```json
{ "code": 0, "message": "ok", "data": { "items": [{ "id": 1, "text": "查一下我的成绩" }] } }
```

无启用：`items: []`。排序：`sort_order ASC, id ASC`，`LIMIT 6`。

### 5.3 Admin API

前缀 `/api/admin/agent-chat-suggestions`，`requireProvisionedAdminAuth`。

- `GET`：分页 + 可选 `enabled`；列表含 `sortOrder`
- `POST`：`{ text, enabled?, sortOrder? }`
- `PATCH /:id`：`text` / `enabled` / `sortOrder` 至少一项
- `DELETE /:id`：硬删

启用不互斥。不存在 → `40431`。

## 6. 验收（测试）

1. Seed/创建启用后 App GET 有序返回。
2. 多条启用均返回（≤6）。
3. 空/超长 `text` 被拒；无 JWT 401。
4. 禁用后不再出现在 App 列表。
