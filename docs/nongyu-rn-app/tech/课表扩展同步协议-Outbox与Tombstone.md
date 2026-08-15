# 技术方案：课表扩展同步协议（Outbox + Tombstone）

| 项       | 内容                                                             |
| -------- | ---------------------------------------------------------------- |
| Spec     | `docs/nongyu-rn-app/specs/课表扩展同步协议-Outbox与Tombstone.md` |
| 需求类型 | **基建**                                                         |
| 状态     | **已确认**                                                       |

---

## 1. 技术选型

| 领域           | 选型                             |
| -------------- | -------------------------------- |
| 本地队列       | MMKV JSON 数组                   |
| 远程 tombstone | MySQL 表 `course_ext_tombstones` |
| 前台触发       | React Native `AppState`          |
| 新增依赖       | 无                               |

---

## 2. Node

### 2.1 迁移 `003_course_ext_tombstones.sql`

```sql
CREATE TABLE IF NOT EXISTS course_ext_tombstones (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  entity VARCHAR(16) NOT NULL,      -- schedule | note | todo
  entity_id CHAR(36) NOT NULL,
  deleted_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_entity (user_id, entity, entity_id),
  KEY idx_tombstones_user_deleted (user_id, deleted_at),
  CONSTRAINT fk_tombstones_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.2 API

| 方法   | 路径                             | 说明                    |
| ------ | -------------------------------- | ----------------------- |
| GET    | `/api/app/course-ext/tombstones` | 近 30 天 tombstone 列表 |
| DELETE | 现有 `/schedules                 | notes                   | todos/:id` | 删实体后 upsert tombstone |

---

## 3. RN

### 3.1 新增文件

```text
model/syncTypes.ts              # OutboxOp / Tombstone
data/courseExtOutboxStore.ts
data/courseExtTombstoneStore.ts
data/courseExtSync.ts           # flushOutbox + mergeWithTombstones
```

### 3.2 `courseExtRepository` 改造

- 写失败 → `enqueueOutbox`
- 删除：先本地删 + 本地 tombstone → 远程 delete；失败则 outbox delete
- `pullCourseExt`：并行拉三类 + tombstones → 合并 → flushOutbox → 返回快照

### 3.3 Hook

`useCourseExt`：queryFn 内 pull；`AppState` active 时 flush。

### 3.4 登出

`clearLocalCourseExt` 扩展清 outbox + tombstones。

---

## 4. 注意事项

- create flush 遇「已存在」视为成功（幂等）
- tombstone 与实体同 id 时，tombstone 优先（删除传播）
- 30 天窗口仅作用于 GET 返回；表内历史可后续定时 purge（本期不做 cron）
