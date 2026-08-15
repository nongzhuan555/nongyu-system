# 实施计划：课表扩展同步协议（Outbox + Tombstone）

| 项   | 内容                                          |
| ---- | --------------------------------------------- |
| Spec | `specs/课表扩展同步协议-Outbox与Tombstone.md` |
| Tech | `tech/课表扩展同步协议-Outbox与Tombstone.md`  |
| 状态 | **执行中**                                    |

---

## 里程碑

| #   | 内容                                              | 验收                 |
| --- | ------------------------------------------------- | -------------------- |
| M1  | 文档已落盘                                        | Spec/Tech/Plan 存在  |
| M2  | Node 迁移 + DELETE 写 tombstone + GET             | type-check 通过      |
| M3  | RN outbox/tombstone store + repository 合并/flush | type-check 通过      |
| M4  | Hook AppState + 登出清理 + BugLog                 | lint/type-check 通过 |

## 非目标

- 实时推送、字段级冲突、服务端 cron purge
