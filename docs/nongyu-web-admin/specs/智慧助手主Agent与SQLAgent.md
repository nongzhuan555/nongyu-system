# Spec：管理端智慧助手主 Agent + SQLAgent

| 项        | 内容                                                                                         |
| --------- | -------------------------------------------------------------------------------------------- |
| 应用      | `apps/nongyu-web-admin`（主）；后端 SQL 执行仍走现有 Node `POST /api/admin/track/query` → Go |
| 需求类型  | **业务**                                                                                     |
| PRD       | `docs/forhuman/rawprds/nongyu-web-admin/管理端智慧助手主Agent与SQLAgentPRD.md`（已确认）     |
| 视觉准则  | `design-system/web-admin/MASTER.md`（本期不改对话壳视觉）                                    |
| 前置 Spec | `智慧助手一期.md`、`数据大屏.md`；Track 口径见 `docs/nongyu-go-track-server/接口文档.md`     |
| 对照      | `nongyu-agent-sdk` `createAgent` / `subAgents` / `tool.render`；现有 `AdminSqlBlock`         |
| 状态      | **已确认**（跳过独立 Tech，直接实施）                                                        |
| 技术方案  | 本期跳过                                                                                     |

---

## 1. 背景

**Why**：一期主 Agent 同时挂业务 API 工具和 `admin_track_sql`。非常规分析时模型直接生成 SQL 打后端，语法错误变成执行失败；SQL 与 API 路由、表结构挤在同一份提示词里。  
**What**：拆成 **主 Agent（业务 API）+ SQLAgent（Track 非常规问数）**。主 Agent 不再自带 SQL 执行；SQLAgent 生成 SQL → 浏览器端四项校验全部通过 → 后端执行 → 按结果出图或改写。埋点表少、字段简单，表结构与业务口径 **写死在 SQLAgent 系统提示词**，不做 RAG。

一期会话、模型通道、A2UI 壳、Go `sqlguard` **不变**。

---

## 2. 目标

1. 主 Agent 工具集去掉 `admin_track_sql`，改为调用 SQLAgent 包装 tool。
2. 专用 API 能回答的问题禁止走 SQLAgent。
3. SQLAgent 仅有 `sql_validate`、`sql_execute`；生成 SQL 必须先校验再执行。
4. 四项校验（单语句、只读、表白名单、语法）任一失败均拦截，不发后端；模型改写后再校验。
5. 用户侧仍看到 `AdminSqlBlock`（折叠 SQL + 折线/柱/饼/表）；内部两工具不出独立卡片。
6. SQLAgent 提示词含完整 Track 业务概念与表白名单表结构（附录 A）。

---

## 3. 边界（非目标）

- 修改 `nongyu-agent-sdk` 协议（子 Agent 事件冒泡、嵌套流式、改 `agentAsTool` 默认只返回文本等）。
- RAG / 动态 schema 工具。
- SQL 打业务 MySQL；查询 `meta_jobs` 或其它非白名单对象。
- 写语句与 DDL；用户确认后才执行 SQL。
- 新图表类型；删除或迁入 SQLAgent 的用户/大盘/埋点专用 GET 工具。
- SQLAgent 单独模型配置。
- 改 Go `sqlguard` / Node `POST /api/admin/track/query` 契约（后端闸门保持一期）。
- 改对话壳、会话、登录清理。

---

## 4. Grill 共识

| 决策        | 结论                                                                          |
| ----------- | ----------------------------------------------------------------------------- |
| 归类        | 业务为主；不改 SDK                                                            |
| 出图        | 包装 tool `admin_sql_agent` + 现有 `AdminSqlBlock`；内部校验/执行对用户不可见 |
| 工具        | 仅 `sql_validate`、`sql_execute`                                              |
| `chartType` | 执行工具只收 `sql`；包装输出携带 `chartType`                                  |
| 调用时机    | 仅当专用 API 工具无法回答时                                                   |
| 库          | Track SQLite 四表；解析器用 `sqlite3-parser`                                  |
| 校验        | 四项全拦截（含语法错误）；执行前复用同一套校验                                |
| 展示        | 卡片为主、短句为辅                                                            |
| 重试        | 同一包装调用内最多 **3 次**后端执行（校验拒绝不计）                           |
| 提示词      | 定位 → 附录 A 表结构与口径 → 流程 → 安全规范；不 RAG                          |

---

## 5. 详细需求

### 5.1 主 Agent

| 项         | 约定                                                                        |
| ---------- | --------------------------------------------------------------------------- |
| 名称       | 保持 `nongyu-admin-assistant`                                               |
| 模型       | 与一期相同（自有 Key 优先，否则平台代理）                                   |
| `maxSteps` | 保持现有量级（当前 15）                                                     |
| 工具       | 一期 A/B 类全部保留；**删除** `admin_track_sql`；**增加** `admin_sql_agent` |
| 审批       | 仍全部只读，不弹审批                                                        |

**主 Agent 系统提示词（必须满足的语义，不规定逐字文案）**

- 只读问数；禁止编造数字；能调工具必须调工具；禁止写操作。
- 用户列表/学号/姓名 → `admin_users_list`；档案 → `admin_user_detail`。
- 总用户/在线/今日新增 → `admin_dashboard_overview`；增长趋势 → `admin_user_growth`；性别学院校区年级 → `admin_user_distribution`；App 设置分布 → `admin_settings_distribution`。
- 今日日活/崩溃/打开/浏览 → `admin_track_overview`；上述指标趋势 → `admin_track_trend`；页面进入/停留/按钮/性能分布 → `admin_track_dims`；崩溃明细 → `admin_track_crashes`。
- **禁止**自己写 SQL 或调用已删除的 SQL 执行工具。
- **仅当**上述专用工具无法回答 Track 库内非常规分析时，调用 `admin_sql_agent`，把用户问数需求作为任务描述传入。
- 回复以工具卡片/图表为准，不要用纯 Markdown 重复贴全部数字。

`admin_sql_agent` 的 `description` 必须让主 Agent 能判断调用时机，语义包含：

> 智能问数子 Agent。仅用于现有用户/大盘/埋点专用 API 工具无法覆盖的 Track SQLite 非常规分析（跨事件类型组合、自定义过滤、非标准聚合等）。禁止用本工具替代日活概览、标准趋势、标准维度分布、崩溃列表、用户档案等已有接口。

### 5.2 SQLAgent 包装 tool（用户可见）

| 项                 | 约定                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| 工具名             | `admin_sql_agent`                                                                                         |
| 对主 Agent 入参    | `{ query: string }`（自然语言任务描述）                                                                   |
| `render.component` | `AdminSqlBlock`（与现网 SQL 卡相同）                                                                      |
| UI 注册            | `registerToolUI("admin_sql_agent", AdminSqlBlockCard)`；去掉 `admin_track_sql` 注册                       |
| 内部               | 独立 `createAgent`（SQLAgent），与主 Agent **同一** `OpenAIProvider` 配置；**不**把内部 tool 挂到主 Agent |

**成功时输出（必须能被现有 `AdminSqlBlockCard` 渲染）**

```ts
{
  sql: string;           // 实际执行的 SQL
  columns: string[];
  preview: Record<string, unknown>[]; // 供卡片与模型上下文，建议 ≤30 行
  chartType: "line" | "bar" | "pie" | "table";
  uiId: string;          // 全量行仍走现有 sqlResultStore
  truncated: boolean;
  rowCount: number;
}
```

`chartType` 由 SQLAgent 按结果形态选择：趋势 → `line`；比例/构成 → `pie`；分类对比 → `bar`；明细或无法成图 → `table`。

**失败时**：包装 tool 以工具错误结束（有 `error` 文案），卡片走现有失败态。不得假装查到 0 行。

**约束**

- 内部 `sql_validate` / `sql_execute` 不注册主对话 UI。
- 包装层必须交出上表结构，不能只把 SQLAgent 自然语言当作最终输出。
- 同一 `admin_sql_agent` 调用内，`sql_execute` 真正请求后端最多 **3** 次；第 4 次必须拒绝并返回错误。
- SQLAgent `maxSteps` 建议 8–12，须足够完成「校验失败改写」循环，且受 3 次执行上限约束。

### 5.3 SQLAgent

| 项         | 约定                                                     |
| ---------- | -------------------------------------------------------- |
| 名称       | `admin_sql_agent`（与包装 tool 同名，作为子 Agent name） |
| 工具       | 仅 `sql_validate`、`sql_execute`                         |
| 系统提示词 | 四段：定位；附录 A 全文；流程；安全规范。禁止 RAG        |

**定位段必须写清**：本 Agent 只查 Track 只读库；不回答可用专用 API 的问题；不编造数字。

**流程段必须写清**

1. 理解 `query` 中的问数需求。
2. 按附录 A 生成一条只读 SQL。
3. 调用 `sql_validate`。
4. 未通过 → 按返回原因改 SQL，再次校验；**未通过不得调用 `sql_execute`**。
5. 通过后调用 `sql_execute`（仅 SQL）。
6. 执行成功 → 选择 `chartType`，结束本轮并让包装层出图。
7. 执行失败 → 改 SQL，从步骤 3 再来；后端执行满 3 次仍失败则停止，把错误交回主 Agent。

**安全规范段必须写清**：只读、单语句、表白名单、禁止 `meta_jobs`、禁止注释/分号绕过写操作、禁止 `ATTACH`/`PRAGMA` 等；与 §5.5 及后端 `sqlguard` 对齐。

今日 vs 历史口径（提示词必须包含，避免幻觉）：

- **今天**的 DAU/打开/浏览/崩溃等概览类数字，优先让主 Agent 走专用 API；若已进入 SQLAgent 且问的是「今天」，应对 `events` 实时聚合，**不要**用可能尚未写出的当日 `daily_metrics` / `daily_dims`。
- **历史日**可读 `daily_metrics` / `daily_dims`。
- DAU：当日 `event_type='app_open' AND user_id IS NOT NULL` 的去重 `user_id` 数。
- `screen_views`（进入）：`event_type='screen_view' AND duration_ms IS NULL`。
- `screen_dwell_avg`：`event_type='screen_view' AND duration_ms IS NOT NULL`，对 `duration_ms` 求平均（整数 ms）。

### 5.4 工具契约

#### `sql_validate`

| 项     | 约定                                                      |
| ------ | --------------------------------------------------------- |
| 入参   | `{ sql: string }`，非空，建议 max 8000 字符（与后端对齐） |
| 解析器 | `sqlite3-parser`（浏览器 ESM）                            |
| 副作用 | 无网络、无后端                                            |

**通过**

```ts
{
  ok: true;
}
```

**拦截**（`ok` 必须为 `false`，至少一条 `errors`）

```ts
{
  ok: false;
  errors: Array<{
    code: "SYNTAX" | "MULTI_STMT" | "NOT_SELECT" | "BAD_TABLE";
    message: string;
    tables?: string[];
  }>;
}
```

四项判定见 §5.5。语法错误的 `message` 须含解析器给出的可读原因（有位置则带位置）。

#### `sql_execute`

| 项     | 约定                                                                                            |
| ------ | ----------------------------------------------------------------------------------------------- |
| 入参   | `{ sql: string }` **仅此一项**，无 `chartType`                                                  |
| 预检   | 调用与 `sql_validate` **同一套**四项校验；不通过则返回与校验相同的拦截结构，**不发 HTTP**       |
| 次数   | 本包装调用内第 4 次及以后：返回明确错误（如超过 3 次执行上限），不发 HTTP                       |
| 后端   | 现有 `queryTrackSql` → `POST /api/admin/track/query`                                            |
| 行存储 | 成功时 `putSqlRows(uiId, rows)`，返回 `preview`（前 30 行）+ `uiId`，避免把全量行塞进模型上下文 |

**成功**

```ts
{
  sql: string;
  columns: string[];
  preview: Record<string, unknown>[];
  truncated: boolean;
  rowCount: number;
  uiId: string;
}
```

**失败**：后端 4xx/5xx 或网络错误时返回可读 `message`（非法 SQL 用后端文案，不伪装 0 行）。

### 5.5 前端校验规则（体验层）

实现为 **一份**纯函数，供 `sql_validate` 与 `sql_execute` 共用。不替代 Go `sqlguard`。

| #   | 规则                                                                                                                                                                              | 失败 `code`  | 行为                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------- |
| 1   | 解析后只能有 **一条**语句；trim 后仍含额外 `;` 分隔的语句即失败                                                                                                                   | `MULTI_STMT` | 拦截                             |
| 2   | 语句类型仅为 `SELECT` 或 `WITH`（CTE 最终仍须是只读查询）。拦截 CREATE/ALTER/DROP/TRUNCATE/INSERT/UPDATE/DELETE/REPLACE/ATTACH/DETACH/VACUUM/REINDEX/PRAGMA 等                    | `NOT_SELECT` | 拦截                             |
| 3   | 抽取 SQL 中全部 **物理表**（CTE 名不算）。每个必须 ∈ `{events, daily_metrics, daily_dims, user_presence}`（大小写不敏感）。`meta_jobs` 及其它表失败。子查询 / JOIN 中的表同样检查 | `BAD_TABLE`  | 拦截                             |
| 4   | `sqlite3-parser` 解析失败或文法错误                                                                                                                                               | `SYNTAX`     | 拦截；模型必须重新生成，禁止执行 |

空 SQL、超过 8000 字符：拦截（可归入 `SYNTAX` 或与后端一致的过长说明）。

### 5.6 用户可见结果

- 主对话：`admin_sql_agent` 执行中骨架 → 成功 `AdminSqlBlock`（折叠「已执行 SQL」+ 图或表）→ 主 Agent 最多一句结论。
- 截断时沿用现有「结果已截断」提示。
- 不把超大 `rows` 抄进 Markdown。

### 5.7 依赖

- `apps/nongyu-web-admin` 增加依赖 `sqlite3-parser`。
- 不引入 `js-sql-parser`、`dt-sql-parser`、`sql.js`。

---

## 6. 业务流程

```text
管理员提问
  → 主 Agent 判断
       ├─ 专用 API 能答 → 调对应 tool → 原有卡片
       └─ Track 非常规分析 → admin_sql_agent(query)
              → SQLAgent：生成 SQL
              → sql_validate（四项）
                    ├─ 失败 → 改 SQL → 再校验（未通过不得执行）
                    └─ 通过 → sql_execute
                         ├─ 预检失败 → 同校验失败
                         ├─ 后端失败 → 改 SQL 再校验再执行（最多 3 次后端执行）
                         └─ 成功 → 选 chartType → 包装输出 AdminSqlBlock
  → 主 Agent 短句收尾
```

---

## 7. 验收标准和测试方案

### 7.1 UI / 操作

| #   | 操作                                               | 期望                                                                         |
| --- | -------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | 「今天日活多少」                                   | 只调 `admin_track_overview`（或等价专用 tool），**不**出现 `admin_sql_agent` |
| 2   | 「最近崩溃有哪些」                                 | 只调 `admin_track_crashes`，不调 SQLAgent                                    |
| 3   | 「按机型看近 7 日 crash 次数」等专用接口没有的组合 | 调 `admin_sql_agent`，出现折叠 SQL + 图或表                                  |
| 4   | 打开该卡片                                         | 可见已执行 SQL；图为折线/柱/饼之一，或明细表                                 |
| 5   | 主 Agent 工具过程                                  | 可见 `admin_sql_agent`，不可见 `sql_validate` / `sql_execute` 独立卡         |

### 7.2 校验 / 执行（可用单测钉规则，助手侧用构造 SQL 观察）

| #   | 输入                                                                        | 期望                                          |
| --- | --------------------------------------------------------------------------- | --------------------------------------------- |
| 6   | `SELECT 1; SELECT 2`                                                        | `MULTI_STMT`，无 Track query 请求             |
| 7   | `DELETE FROM events` / `INSERT INTO events …` / `PRAGMA table_info(events)` | `NOT_SELECT`，无请求                          |
| 8   | `SELECT * FROM meta_jobs` 或 `events JOIN sqlite_master`                    | `BAD_TABLE`，无请求                           |
| 9   | 文法错误（如 `SELCT * FROM events`）                                        | `SYNTAX`，无请求；SQLAgent 应改写后再执行     |
| 10  | 合法 `SELECT … FROM events WHERE …`                                         | 校验通过，打现有 query 接口，卡片有数据或空表 |
| 11  | 同一问数连续执行超过 3 次仍失败                                             | 第 4 次不发后端，对用户展示失败               |

### 7.3 回归

- 用户列表/详情、大盘 KPI/增长/分布、设置分布卡片与一期一致。
- 后端对写 SQL、多语句、非白名单表仍 4xx（前端被绕过时）。
- 主动登出清理、会话、模型设置不因本期回归。

---

## 附录 A：SQLAgent 提示词必须写全的表结构与口径

以下内容必须出现在 SQLAgent `systemPrompt` 中（可排版，不可删减字段/枚举/口径）。来源：现网 Track 迁移 + 接口文档。

### A.1 库与表白名单

- 库：Go Track **SQLite**（只读查询）。
- 可查：`events`、`daily_metrics`、`daily_dims`、`user_presence`。
- 禁止：`meta_jobs` 及任何未列出对象（含 `sqlite_master` 等）。

### A.2 `events`

| 列               | 类型         | 说明                                                                       |
| ---------------- | ------------ | -------------------------------------------------------------------------- |
| `id`             | INTEGER      | PK AI                                                                      |
| `event_id`       | TEXT         | 客户端 UUID，唯一                                                          |
| `user_id`        | INTEGER NULL | 业务用户 id，未登录可空                                                    |
| `student_no`     | TEXT NULL    | 学号冗余                                                                   |
| `event_type`     | TEXT         | 见枚举                                                                     |
| `event_name`     | TEXT         | 页面路由名 / 按钮名 / 性能名 / 错误名（`llm_proxy_fail` 时为错误码字符串） |
| `app_version`    | TEXT NULL    |                                                                            |
| `platform`       | TEXT NULL    | 仅 `ios` / `android` / NULL                                                |
| `device_brand`   | TEXT NULL    |                                                                            |
| `session_id`     | TEXT NULL    | 一次冷启动会话                                                             |
| `duration_ms`    | INTEGER NULL | 性能耗时或页面离开停留；`screen_view` 进入事件为 NULL                      |
| `props_json`     | TEXT NULL    | JSON 对象字符串                                                            |
| `client_ts_ms`   | INTEGER NULL | 客户端 UTC ms                                                              |
| `received_at_ms` | INTEGER      | 服务端接收 UTC ms                                                          |
| `stat_date`      | TEXT         | `YYYY-MM-DD`，上海业务日                                                   |

`event_type`：`screen_view`（页面；进入无 `duration_ms`，离开有）· `button_click` · `perf` · `app_open`（冷/热启动，支撑 DAU）· `heartbeat` · `crash`（JS 异常）· `llm_proxy_fail`（平台 LLM 代理失败，Node 写入）。

### A.3 `user_presence`

Track 侧在线辅助，**不替代**业务库在线字段。列：`user_id` PK、`is_online` 0/1、`last_seen_at_ms`、`platform`、`app_version`、`device_brand`、`updated_at_ms`。

### A.4 `daily_metrics`

历史日无维度指标。PK `(stat_date, metric_key)`。列：`stat_date`、`metric_key`、`metric_value` INTEGER、`updated_at_ms`。

已知 `metric_key`：`dau`、`crash_count`、`app_open_count`、`screen_view_count`、`online_peak`。

今日概览类查询不要依赖当日尚未聚合的本表。

### A.5 `daily_dims`

历史日维度指标。PK `(stat_date, metric_key, dim_key, dim_value)`。列另含 `metric_value`、`updated_at_ms`。

已知 `metric_key` 与默认 `dim_key=name`（值为 `event_name`）：

| metric_key              | 口径                                                           |
| ----------------------- | -------------------------------------------------------------- |
| `screen_views`          | 进入次数：`screen_view` 且 `duration_ms IS NULL`               |
| `screen_dwell_avg`      | 页均停留 ms：`screen_view` 且 `duration_ms IS NOT NULL` 的平均 |
| `button_clicks`         | `button_click` 按 name 计数                                    |
| `perf_p50` / `perf_p95` | `perf` 的 `duration_ms` 分位                                   |

今日维度同样优先扫 `events` live，不要只读空的当日 `daily_dims`。

### A.6 时间

- 业务日：`stat_date` 上海日历 `YYYY-MM-DD`。
- 排序/过滤时刻：优先 `received_at_ms` / `client_ts_ms`（整数 UTC ms）。
