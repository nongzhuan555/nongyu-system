# 实施计划：管理端智慧助手主 Agent + SQLAgent

| 项        | 内容                                                                 |
| --------- | -------------------------------------------------------------------- |
| 日期      | 2026-08-20                                                           |
| 需求类型  | 业务                                                                 |
| 上游 Spec | `docs/nongyu-web-admin/specs/智慧助手主Agent与SQLAgent.md`（已确认） |
| 上游 Tech | 本期跳过                                                             |
| 应用      | `apps/nongyu-web-admin`                                              |
| 状态      | **已落地**                                                           |

## 范围

只改管理端助手组装与 SQL 校验/执行工具。不改 SDK、Node query、Go `sqlguard`。

## 步骤

1. `sqlite3-parser` 写入 catalog + `nongyu-web-admin` dependencies。
2. 共享四项校验纯函数；`sql_validate` / `sql_execute`（执行前复用校验，最多 3 次后端请求）。
3. SQLAgent（附录 A 提示词）+ 包装 tool `admin_sql_agent`（`AdminSqlBlock`）。
4. 主 Agent 去掉 `admin_track_sql`，改提示词与 UI 注册。
5. `pnpm lint` / `type-check` / `fmt`。

## 文件落点

- `apps/nongyu-web-admin/src/assistant/sql/*`
- `apps/nongyu-web-admin/src/assistant/agent.ts`
- `apps/nongyu-web-admin/src/assistant/tools/index.ts`
- `apps/nongyu-web-admin/src/assistant/ui/register.ts`
- 删除或停用原 `tools/sql.ts` 的主 Agent 挂载
