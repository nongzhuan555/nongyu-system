# 农屿系统 · Bugbot / `/review` 项目规则（仅本仓库）

本文件只作用于本仓库的 Cursor Bugbot 与本地 `/review`，不配置 Team Rules，不污染全局。

日常 pre-commit 的 **AI Review 主入口**是用户级 subagent `code-reviewer`（`~/.cursor/agents/code-reviewer.md`），与本文件、下方 Skills 映射对齐。本文件供 Bugbot/`/review` 与该 subagent 共用同一套标准。

## 总原则

1. **按改动路径选用下方「技能映射」中的 Skill 作为审查标准**；同一 PR 多端改动时，分段套用对应 Skill。
2. **优先报真实缺陷**：逻辑错误、安全、数据完整性、鉴权/越权、并发/资源泄漏、明显性能陷阱（CRITICAL/HIGH）。
3. **忽略**：纯格式、命名偏好、import 排序、可由 ESLint/Prettier/gofmt 处理的风格问题。
4. **不要臆造性能问题**：无证据时不要要求盲目 `useMemo`/`useCallback`；RN 侧遵循 Callstack「先测量再优化」护栏。
5. 若审查环境能读取仓库文件：对命中路径**加载对应 Skill 的 `SKILL.md`（及该 Skill 指向的关键 references）**后再下结论；不能加载时，以下「审查要点」为约束摘要。

## 技能映射（CR 时强制对齐）

| 改动范围（路径 / 文件）                                                                                                         | 审查标准 Skill（仓库内）                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/nongyu-web-admin/**`、`apps/nongyu-web-site/**`，以及 Web React/Next 相关 `packages/**` 中的 `*.{tsx,jsx,ts,js}`（非 RN） | [vercel-react-best-practices](../.agents/skills/vercel-react-best-practices/SKILL.md)                                                                                                                                                                                                                                                              |
| `apps/nongyu-rn-app/**`，以及 React Native / Expo 相关代码                                                                      | [react-native-best-practices](../.agents/skills/react-native-best-practices/SKILL.md)                                                                                                                                                                                                                                                              |
| `apps/nongyu-node-server/**`，以及 Node/Express/Fastify API 服务代码                                                            | [nodejs-backend-patterns](../.agents/skills/nodejs-backend-patterns/SKILL.md)                                                                                                                                                                                                                                                                      |
| `**/*.go` 或 Go module 目录                                                                                                     | 组合使用： [golang-security](../.agents/skills/golang-security/SKILL.md)、[golang-error-handling](../.agents/skills/golang-error-handling/SKILL.md)、[golang-context](../.agents/skills/golang-context/SKILL.md)、[golang-database](../.agents/skills/golang-database/SKILL.md)、[golang-code-style](../.agents/skills/golang-code-style/SKILL.md) |
| Schema / migration / DDL / 表结构变更（`**/*.{sql}`、`**/migrations/**`、`**/schema/**` 等）                                    | [database-schema-designer](../.agents/skills/database-schema-designer/SKILL.md)；若在 Go 中访问 DB，同时套用 `golang-database`                                                                                                                                                                                                                     |
| Seed / fixture / 演示数据脚本                                                                                                   | [db-seed](../.agents/skills/db-seed/SKILL.md)                                                                                                                                                                                                                                                                                                      |

路径重叠时：安全与数据正确性优先于风格；RN 目录只用 RN Skill，不要用 Web Next.js 规则硬套。

---

## React Web — `vercel-react-best-practices`（审查要点）

对 Web Admin / 官网等 React（含 Next）改动，按该 Skill 的优先级审查，重点：

### CRITICAL

- **消除异步瀑布**：独立请求应并行（`Promise.all` / 尽早启动 promise）；可跳过的分支不要先 `await`；廉价同步条件应先于远程 flag 判断。
- **Bundle**：避免无必要 barrel 全量导入；重型组件应动态加载；导入路径应可静态分析，避免过宽打包。

### HIGH

- **服务端 / Server Actions**：鉴权必须在 action/API 内部校验，不能只靠页面/中间件表象。
- **避免请求级可变模块状态**（RSC/SSR 串数据）。
- **减少 RSC→Client 无效序列化**（只传客户端用到的字段）。
- **客户端数据获取**：重复请求应可去重（如 SWR 等项目既有方案）；勿在 render 路径制造重复 fetch 瀑布。

### MEDIUM（有明显坏味道再报）

- 在组件内定义子组件导致反复 remount。
- 用 effect 同步可在 render 派生的 state。
- 长列表 / 重渲染的明显反模式（有路径证据时）。

Finding 标题尽量带 Skill 规则前缀（如 `async-*` / `bundle-*` / `server-*`），便于对照 Skill。

---

## React Native — `react-native-best-practices`（审查要点）

对 `nongyu-rn-app` 等 RN 改动，按 Callstack Skill 审查，重点：

### CRITICAL

- **列表**：长列表勿用无滚动的巨型 `ScrollView` 塞大量子项；应 `FlatList` / `FlashList` / Legend List 等。
- **JS 线程堵塞**：重计算、过大同步工作、错误的动画驱动（应上 UI 线程 / Reanimated 的却跑在 JS）。
- **Bundle**：危险的 barrel 导入、明显不必要的巨型依赖打进启动路径。

### HIGH

- **TTI / 启动**：阻塞启动的重模块、同步 Bridge/Turbo Module 误用。
- **内存**：典型泄漏（未清理的监听/定时器/订阅）、过大图片/列表缓存问题。
- **动画**：可卡顿的 JS 驱动动画；手势与可滚动容器冲突等。

### Review 护栏（来自该 Skill，必须遵守）

- 不要在没有渲染/FPS 证据时要求乱加 memo。
- 不要猜测 stale closure；需有读取路径或复现说明。
- 建议 API 前考虑库版本差异（例如 FlashList v2 与 `estimatedItemSize`）。

---

## Node.js 后端 — `nodejs-backend-patterns`（审查要点）

对 `nongyu-node-server` 等 Node API 改动：

- 输入校验（边界处 schema 校验）、统一错误处理、禁止吞错。
- 鉴权/鉴权失败路径明确；禁止将密钥写死在代码。
- 生产 CORS 勿随意 `*`；敏感配置走环境变量。
- 数据库访问注意连接池、超时、错误传播；需要时有健康检查/优雅关闭意识。
- 危险模式：`eval`、命令拼接、SQL 字符串拼接用户输入、未限流的昂贵公开接口。

---

## Go 后端 — golang-* Skills（审查要点）

对 Go 改动（组合 Skills）：

- **security**：注入（SQL/命令）、密钥与日志脱敏、不安全的 TLS/Cookie、路径穿越、弱随机数等。
- **error-handling**：错误必须检查；用 `%w` 包装；在边界记录/返回，避免丢失因果。
- **context**：`ctx` 向下传；DB/HTTP/RPC 用带 Context 的 API；勿把 request ctx 用于超出请求生命周期的后台任务（需时用正确派生）。
- **database**：参数化查询；`rows.Close` / 错误处理；`sql.ErrNoRows` 显式区分；事务与 `FOR UPDATE` 使用正确。
- **code-style**：仅在严重损害可读性/正确性时提出；不做纯风格刷屏。

---

## 数据库 Schema / Seed

- **schema-designer**：规范化、约束、索引、迁移可回滚/可部署性、MySQL 习惯（本项目偏好）与完整性。
- **db-seed**：幂等、FK 顺序、勿写入真实密钥/生产 PII；与 schema 一致。

---

## 报告方式

- 按 **Critical / Warning / Suggestion** 分级；Blocking 仅用于安全、数据损坏、鉴权绕过、明确逻辑错误、CRITICAL 性能陷阱。
- 每个 finding 尽量注明：**命中路径 + 对应 Skill 名 + 规则类别**。
- 无问题的类别不要凑数评论。
