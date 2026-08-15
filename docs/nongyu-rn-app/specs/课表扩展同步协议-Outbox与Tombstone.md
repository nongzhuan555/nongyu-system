# Spec 补充：课表扩展同步协议（Outbox + Tombstone）

| 项       | 内容                                                      |
| -------- | --------------------------------------------------------- |
| 应用     | `apps/nongyu-rn-app` + `apps/nongyu-node-server`          |
| 需求类型 | **基建**                                                  |
| 父 Spec  | `docs/nongyu-rn-app/specs/课表扩展-自定义日程备注待办.md` |
| 状态     | **已确认**（用户 2026-08-15）                             |

---

## 1. 背景

课表扩展已实现本地优先 + 远程 push/pull。当前局限：

1. 远程写失败仅静默保留本地，无重推队列；
2. 跨设备删除不传播（设备 A 删除后，设备 B 本地仍保留）。

**What**：补齐 outbox 重推与 tombstone 删除传播（含 Node 侧 tombstone 表）。

---

## 2. 目标

| #   | 目标                                               | 验收                            |
| --- | -------------------------------------------------- | ------------------------------- |
| S1  | 写远程失败入 outbox，进课表 / App 回前台自动 flush | 断网新增 → 联网后远程可见       |
| S2  | 删除写远程 tombstone；pull 时按 tombstone 清本地   | A 删 → B 进课表后本地消失       |
| S3  | tombstone 保留 30 天后可清理                       | 超 30 天记录不再返回 / 可 purge |
| S4  | 登出清本地 outbox + tombstone                      | 登出后无残留                    |

---

## 3. 边界

- **不做** 实时推送 / WebSocket
- **不做** 字段级冲突合并（同 id 以远程 `updatedAt` 为准）
- **不做** 多设备同时编辑同一条的 OT/CRDT

---

## 4. 详细需求

### 4.1 Outbox（本地）

```ts
type CourseExtOutboxOp = {
  id: string; // 队列项 id（uuid）
  op: "create" | "update" | "delete";
  entity: "schedule" | "note" | "todo";
  entityId: string;
  payload?: unknown; // create/update 的完整或 patch 载荷
  updatedAt: string; // ISO
};
```

- MMKV key：`course:outbox:{studentId}`
- 写远程失败 → 入队（同 entityId+op 去重，保留最新）
- flush 成功 → 出队
- create 若远程已存在（409/唯一冲突）→ 视为成功出队

### 4.2 Tombstone

```ts
type CourseExtTombstone = {
  entity: "schedule" | "note" | "todo";
  entityId: string;
  deletedAt: string; // ISO
};
```

- **远程表** `course_ext_tombstones`：`(user_id, entity, entity_id)` 唯一；`deleted_at`
- DELETE 业务数据成功时**同时**插入/更新 tombstone
- GET `/api/app/course-ext/tombstones`：返回该用户近 30 天 tombstone
- 本地 MMKV：`course:tombstones:{studentId}`，与远程合并

### 4.3 合并规则

| 场景                           | 行为                                                         |
| ------------------------------ | ------------------------------------------------------------ |
| 同 id，远程存在                | 远程覆盖本地（远程权威）                                     |
| 本地有、远程无，且无 tombstone | 视为未同步 → 入 outbox create 重推                           |
| 远程 tombstone 命中本地        | 删本地条目；清同 id outbox create/update                     |
| 本地 tombstone 且远程仍有实体  | 再推远程 delete                                              |
| 删除成功                       | 本地删 + 远程 delete（服务端写 tombstone）+ 本地记 tombstone |

### 4.4 触发时机

- 进入课表：`pull` → 合并 → `flushOutbox`
- App 回前台（`AppState` active）：`flushOutbox`（有 studentId 时）
- 每次写失败：立即入队（不阻塞 UI）

### 4.5 登出

追加清理：`course:outbox:{studentId}`、`course:tombstones:{studentId}`。

---

## 5. 验收

- [ ] 断网新增日程/备注/待办，恢复网络后进课表，远程有记录
- [ ] 设备 A 删除，设备 B 进课表后本地对应条目消失
- [ ] 删除失败后本地已消失，联网 flush 后远程也消失
- [ ] 登出后 outbox/tombstone 本地 key 清空
- [ ] Node DELETE 后 tombstone 表有对应行；GET tombstones 可查

---

## 6. 修订记录

| 日期       | 内容                                   |
| ---------- | -------------------------------------- |
| 2026-08-15 | 初版：outbox + Node tombstone（30 天） |
