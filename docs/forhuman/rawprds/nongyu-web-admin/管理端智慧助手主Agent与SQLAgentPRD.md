# 管理端智慧助手：主 Agent + SQLAgent PRD

> 来源：2026-08-20 需求对齐会话。业务为主（子 Agent 出图用现有包装 tool，不改 SDK 协议）。  
> 状态：已确认。  
> 上游：`农屿管理后台智慧助手PRD.md`（一期已实现）。

## 背景

管理端智慧助手一期已是「只读问数」：主 Agent 同时挂用户/大盘/埋点专用 API 工具，以及一条 `admin_track_sql` 兜底。非常规分析时模型直接生成 SQL 打后端，语法错误会变成执行失败；SQL 能力与业务 API 混在同一 Agent，提示词既要管路由又要管表结构，职责不清。

本期把架构改成 **主 Agent + 智能问数 SQLAgent**：主 Agent 只保留业务 API 工具；无法用现有后端接口回答的 Track 库分析，交给 SQLAgent。SQLAgent 内生成 SQL、前端轻量校验、再执行，按结果出图或改写 SQL。

## 目标

1. 主 Agent 去掉自带 SQL 执行能力，只通过调用 SQLAgent 做非常规问数。
2. SQLAgent 专门处理「现有业务 API 工具覆盖不了」的 Track 库查询。
3. SQLAgent 具备两个工具：语法/规则校验、SQL 执行。
4. 生成的 SQL 先走浏览器端轻量校验；多语句、写操作、非白名单表、**语法错误**一律拦截，不打后端，由模型改写后再校验，通过后才能执行。
5. 执行成功后以现有 SQL 图表卡片展示；主 Agent 最多补一句结论，不重复贴数字。
6. SQLAgent 系统提示词写全当前埋点业务概念与表结构（表少、字段简单，不做 RAG）。

## 非目标

- 修改 `nongyu-agent-sdk` 协议（子 Agent toolCalls 冒泡、嵌套流式等另开切片）。
- 引入 RAG / 动态 schema 检索。
- SQL 打业务 MySQL；查询 `meta_jobs` 或其它非白名单表。
- 写操作（INSERT/UPDATE/DELETE/DDL 等）。
- 新图表类型（仍为折线 / 柱 / 饼 / 表）。
- 用户确认后再执行 SQL（一期已定：自动执行，卡片里折叠展示 SQL 原文）。
- 把用户管理、大盘、埋点专用 GET 工具迁入 SQLAgent 或删除。
- 为 SQLAgent 单独配置另一套模型（与主 Agent 同一 Provider）。

## 需求类型

业务为主。出图继续走现有 `AdminSqlBlock` 包装 tool；不改 SDK。

## Grill 共识

| 项            | 结论                                                                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 归类          | 业务为主；不改 SDK                                                                                                                       |
| 子 Agent 出图 | 主 Agent 只看到一个 SQLAgent 包装 tool（带 `AdminSqlBlock`）；内部校验/执行对用户不可见；包装层输出 `sql/columns/preview/chartType/uiId` |
| SQLAgent 工具 | 仅 `sql_validate`、`sql_execute`                                                                                                         |
| `chartType`   | 执行工具只收 SQL；由 SQLAgent 最终结构化结果携带 `line` / `bar` / `pie` / `table`                                                        |
| 调用时机      | 仅当用户/大盘/埋点专用 API 工具无法回答时，主 Agent 才调 SQLAgent                                                                        |
| 数据范围      | 仅 Track SQLite：`events`、`daily_metrics`、`daily_dims`、`user_presence`                                                                |
| 解析库        | `sqlite3-parser`（真 SQLite 文法）。**不用** `js-sql-parser` / `dt-sql-parser`                                                           |
| 校验四项      | ① 仅单条语句 ② 仅 SELECT/WITH ③ 表白名单 ④ 语法合法性                                                                                    |
| 拦截策略      | 四项任一不通过均 **拦截**，禁止执行；语法错误必须让模型重新生成，不得带错提交                                                            |
| 前后端边界    | 前端体验层（减少无效请求，含语法拦截）；后端 `sqlguard` 安全层（复刻单语句、只读、表白名单 + 真实执行）                                  |
| 对话展示      | 卡片为主、短句为辅                                                                                                                       |
| 执行重试      | 同一轮任务最多执行 SQL **3 次**（含首次），再失败则把错误交回主 Agent                                                                    |
| 系统提示词    | 定位 → 表结构与业务概念（写全、不 RAG）→ 生成/校验/执行/出图流程 → 安全规范                                                              |
| 文档          | 先本 PRD，通过后写 Spec                                                                                                                  |

## 详细需求

### 1. 主 Agent

- 保留一期用户、大盘、埋点专用 API 工具。
- 工具集中移除 `admin_track_sql`。
- 增加 SQLAgent 包装 tool（逻辑名建议 `admin_sql_agent`）：入参为自然语言问数任务；出参为可被 `AdminSqlBlock` 渲染的结构。
- 系统提示词去掉「自己写 SQL / 直接调 SQL 执行」的说明；改为：专用 API 能答就调 API；不能答的 Track 非常规分析才调 SQLAgent。
- SQLAgent 的 `description` 须写清调用时机，供主 Agent 路由。

### 2. SQLAgent

**定位**：智能问数子 Agent。只解决业务 API 覆盖不了的 Track 库分析，不回答用户档案、大盘 KPI 等已有接口能答的问题。

**工具**

| 工具           | 入参       | 行为                                                                                                                                                     |
| -------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sql_validate` | 待校验 SQL | 用 `sqlite3-parser` 做四项校验；全部通过才算通过，否则返回拦截原因（含语法错误位置/说明）                                                                |
| `sql_execute`  | 仅 SQL     | 发请求前复用四项校验（不通过则拒绝、不打后端）；通过后请求现有 `POST /api/admin/track/query`；返回列、行预览、截断标记，或错误文案。**不收 `chartType`** |

**流程（系统提示词约束）**

1. 理解用户问数需求。
2. 结合写全的表结构与业务概念生成只读 SQL。
3. 必须先调 `sql_validate`。
4. 任一项不通过（含语法错误）→ 按拦截原因改 SQL，再校验；**未通过不得调用 `sql_execute`**。
5. 四项全部通过后，才调 `sql_execute`。
6. 成功：按结果选择 `chartType`，把结构化结果交给包装层出图；执行失败：改 SQL 并重新走校验，最多执行 3 次。

**系统提示词结构**

1. 定位与职责（与 description 一致）。
2. 埋点业务概念 + 四张表白名单的字段/类型/含义（写全，来自现网 Track 表，含 `event_type` 枚举等）。
3. 上述生成 → 校验 → 执行 → 出图或改写流程。
4. 安全规范：只读、单语句、表白名单、禁止 `meta_jobs`、禁止多语句与注释绕过写操作等（与后端闸门对齐）。

### 3. 前端校验（体验层）

用 `sqlite3-parser` 在浏览器解析 SQLite AST，实现：

1. **单语句**：AST 根节点只能有一条；分号分隔多语句拦截。
2. **只读**：仅放行 `SELECT`、`WITH`；拦截 CREATE/ALTER/DROP/TRUNCATE/INSERT/UPDATE/DELETE/PRAGMA 等。
3. **表白名单**：抽取 SQL 依赖的所有物理表，必须 ⊆ `{events, daily_metrics, daily_dims, user_presence}`；`meta_jobs` 及其它表拦截。
4. **语法合法性**：`sqlite3-parser` 解析失败或存在文法错误 → **拦截**，返回错误说明，要求模型重新生成；不得把语法错误的 SQL 交给 `sql_execute`。

`sql_execute` 发后端前复用同一套四项校验；任一不通过则拒绝请求、不打后端。前端仍不承担安全兜底。后端继续 `sqlguard` + 真实 SQLite 执行。

### 4. 用户可见结果

- 主对话展示 SQLAgent 包装 tool：加载骨架 → 成功则 `AdminSqlBlock`（折叠已执行 SQL + 图或表）。
- 内部 `sql_validate` / `sql_execute` 不对用户单独出卡片。
- 主 Agent 可追加一句结论，不以 Markdown 堆数字替代卡片。

## 验收要点

1. 问「今日日活/总用户/崩溃列表」等专用接口能覆盖的问题，主 Agent **不**调 SQLAgent。
2. 问专用接口覆盖不了的 Track 分析，主 Agent 调 SQLAgent，对话里出现 SQL 图/表卡片（含可折叠 SQL）。
3. 主 Agent 工具列表中不再有直接执行 SQL 的工具。
4. 多语句、INSERT/UPDATE 等写语句、查 `meta_jobs`、语法错误：前端校验拦截，不发后端；SQLAgent 必须改写并再次校验通过后才能执行。
5. 后端执行报错则改 SQL、重新校验后再执行，同轮最多执行 3 次。
6. 执行工具入参只有 SQL；图表类型由 SQLAgent 最终结果给出，卡片仍支持折线/柱/饼/表。
7. 不引入 RAG；SQLAgent 提示词含完整表结构与业务口径。
