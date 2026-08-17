# Spec：自研埋点 SDK 一期

| 项       | 内容                                                                                                                                                            |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 应用     | `apps/nongyu-rn-app`                                                                                                                                            |
| 需求类型 | **基建**                                                                                                                                                        |
| PRD      | `docs/forhuman/rawprds/nongyu-rn-app/User/埋点及用户交互PRD.md`（仅埋点采集；不含建议反馈）                                                                     |
| 状态     | **已实现**（2026-08-15）；**错误采集扩边已实现**（2026-08-16）                                                                                                  |
| 契约     | [`../nongyu-go-track-server/接口文档.md`](../nongyu-go-track-server/接口文档.md)、[`技术选型.md`](../技术选型.md) §6、[`联调指南-埋点.md`](../联调指南-埋点.md) |
| 技术方案 | [`../tech/自研埋点SDK一期.md`](../tech/自研埋点SDK一期.md)（as-built，供对照实现学习）                                                                          |

---

## 1. 背景

Track HTTP 已可本机联调，但 RN 只有 `TRACK_BASE_URL`，没有采集 / 队列 / 上报。需要按选型落地自研 Telemetry，用与业务登录同一颗 App JWT 直连 Track，支撑页面频次、重点按钮、在线/DAU、JS 故障与后续性能点。

一期落地后，错误面仍偏窄：仅 `ErrorUtils` 全局 JS；无 React Error Boundary、无未处理 Promise、无农屿后端网络/API 失败采集。需在同一 `crash` 事件类型下扩边，支撑管理端崩溃表分析更完整的客户端故障。

## 2. 目标

1. 已登录用户自动上报：`app_open`、全局 `screen_view`（进入 + **可见停留时长**）、周期 `heartbeat`；登出尽力 `presence/offline`。
2. 提供 `track` / `trackClick` / `measure` 给业务显式调用；一期接入底栏 Tab、农屿 AI、退出登录、首页教务/二课入口。
3. 内存队列 + 定时/满批 flush；失败写入 MMKV，依赖服务端 `event_id` 幂等重试。
4. JS 全局异常打 `crash`；**本版不做原生层崩溃**（产品决策 2026-08-15）。
5. **不**走 Node `appFetch` 信封；成功以 Track `{ ok: true }` 为准。
6. **错误采集扩边（2026-08-16）**：
   - 根布局挂一层 React Error Boundary，捕获渲染期组件错误并上报后降级 UI。
   - Hermes 未处理 Promise rejection 上报。
   - 农屿 Node 请求（`appFetch` + `appAuth`）的网络失败与 API 业务失败上报。

## 3. 边界（非目标）

- 不覆盖建议/反馈（PRD「用户交互」段，走广场发帖）。
- **原生层崩溃 / 未捕获原生异常：本版明确不做**（不写 native handler、不落 tombstone、不接商用 APM）；仅保留 JS `crash`。
- 不接商用 APM。
- 不把课表/列表耗时在本期强制打满；只提供 `measure`，课表页后续自行调用。
- 不做可追踪 HOC 组件库（一期用函数 API + 少量重点按钮）。
- 不接管理端 BFF；App 禁止打 Track Admin API。
- 不做管理端「页均停留」聚合 / 大屏指标（本期只保证客户端上报带 `duration_ms` 的 leave 事件；Admin 后置）。
- 未登录（无 App JWT）不上报（含登录页阶段的 API 失败，与一期一致，可接受漏报）。
- **不**采集教务 / 二课等第三方工具库请求失败。
- **不**对 Track 自身 `transport` 失败再打 `crash`（避免环）。
- **不**新增 Track `event_type` / 不改 Go CHECK / 不改 Admin 崩溃表契约；一律复用 `crash` + `event_name` 区分。
- **不**多层 Error Boundary（仅根一层）。
- 一期编码前曾跳过独立 tech / plans（HTTP 契约与选型已锁定）；落地后已补 [`../tech/自研埋点SDK一期.md`](../tech/自研埋点SDK一期.md) 作 as-built 说明。错误扩边不另开独立 tech 新文，只修订该 as-built。仍无独立 plans。

## 4. 详细需求

### 4.1 模块位置

`src/modules/telemetry/`，公开入口 `src/modules/telemetry/index.ts`。  
Error Boundary UI 组件可放在同模块（如 `AppErrorBoundary.tsx`），由根布局挂载。

### 4.2 事件与字段

字段 **snake_case**，对齐 Track 接口文档 §4.1。`user_id` 不传。`event_id` 客户端 UUID。公共上下文：`session_id`（一次 JS 运行时）、`app_version`、`platform`（仅 `ios`/`android`）、`device_brand`。

| event_type     | event_name 约定                                            | 触发                                |
| -------------- | ---------------------------------------------------------- | ----------------------------------- |
| `app_open`     | 进程内首次 `cold_start`；再次拿到 Token 为 `session_start` | Token 从空变为有                    |
| `screen_view`  | Expo Router `pathname`（无 query）                         | 见 §4.2.1 进入 / 停留               |
| `heartbeat`    | `heartbeat`                                                | 已登录后每 60s；前后台都发          |
| `button_click` | 稳定英文/路由名，如 `tab_home`、`nongyu_ai`、`logout`      | 显式 `trackClick`                   |
| `perf`         | 调用方传入                                                 | `measure` / `measureAsync`          |
| `crash`        | 见 §4.6                                                    | JS / React / Promise / 农屿请求失败 |

`props` 禁止密码、Token、Cookie；超 4KB 由服务端截断。`stack` / `component_stack` 客户端截断至 **2048** 字符。

#### 4.2.1 `screen_view` 进入与可见停留

| 时机                          | `duration_ms` | `props`                      | 说明                                                     |
| ----------------------------- | ------------- | ---------------------------- | -------------------------------------------------------- |
| 进入（pathname 变化且可追踪） | 不传          | `{ phase: "enter" }`         | 与一期进入埋点兼容；跳过 `/login`                        |
| 离开结算                      | 可见停留毫秒  | `{ phase: "leave", reason }` | `reason`：`route` / `background` / `logout` / `teardown` |

规则：

1. **可见时长**：进 `background` 先结算；回 `active` 同一 path **续开计时**，**不**重复打 enter。
2. 切路由、登出（`shutdownForLogout`）、`canTrack` 变假：结算 leave 并清空当前 path。
3. `duration_ms < 300` 的 leave **不上报**（过滤瞬时跳转噪音）。
4. 实现：`screenDwell.ts` + `TelemetryHost`；登出路径在清 Token 前结算。

### 4.3 传输

- `POST {TRACK_BASE_URL}/v1/track/events`，`Authorization: Bearer <App JWT>`
- 批大小 20～50（实现 **40**）；flush：队列达批、或 **10s** 定时、或登出前强制
- HTTP 503 / 429 / 网络失败：事件回写 MMKV 下次重试
- 无网（NetInfo）不发，只积压
- 队列上限 **300**，超出丢最旧
- `POST /v1/track/presence/offline`：登出在清 Token **之前** 调用（失败忽略，依赖服务端超时）
- `crash` 入队后 **尽力立刻** `flushPending()`（与现 `installCrashTracking` 一致）

### 4.4 宿主

根布局在 `AuthRoot` 内挂 `TelemetryHost`：订阅 session Token、`usePathname`、`AppState`、心跳与 flush 定时器。  
根布局在合适层级挂 `AppErrorBoundary`（至少包住主业务树；建议包在 `AppProviders` 内、可覆盖 Stack / Hosts）。模块加载时继续调用 `installCrashTracking()`（含 Promise tracker）。

### 4.5 鉴权与在线

- Token 取 `getAppAccessToken()`（与业务同一颗）
- PRD：挂后台仍算在线 → `heartbeat` 在 `background` 也继续尝试（系统杀进程则靠 Track 超时）

### 4.6 错误采集扩边

统一 `event_type: "crash"`，用 `event_name` 区分来源。采集失败一律吞错，禁止再抛。

| event_name            | 来源                                                         | 主要 `props`                                       |
| --------------------- | ------------------------------------------------------------ | -------------------------------------------------- |
| `fatal`               | `ErrorUtils` 且 `isFatal === true`                           | `message`, `stack`                                 |
| `js`                  | `ErrorUtils` 且非 fatal                                      | `message`, `stack`                                 |
| `react`               | 根 `ErrorBoundary.componentDidCatch`                         | `message`, `stack`, `component_stack`              |
| `unhandled_rejection` | Hermes `enablePromiseRejectionTracker` 的 `onUnhandled`      | `message`, `stack`（若 rejection 为 Error）        |
| `network`             | `appFetch` / `appAuth` 中 `fetch` 抛错或响应非 JSON 等传输层 | `message`, `method`, `path`（无 query/敏感头）     |
| `api`                 | `parseApiResponse` 抛出的 `AppApiError`（含鉴权失效码）      | `message`, `method`, `path`, `http_status`, `code` |

#### 4.6.1 Error Boundary

1. **仅根一层**；捕获后上报 `react`，展示全屏降级：标题「出了点问题」、短说明、主按钮「重试」（重置 Boundary 状态后重新渲染 children）。
2. 不强制跳登录；不在 Boundary 内 `throw` 二次抛出。
3. 样式对齐 RN App 主题 token（品牌色按钮、次要说明文案），简洁即可。

#### 4.6.2 未处理 Promise

1. 在 `installCrashTracking` 内（或同模块一次性安装）调用 Hermes `enablePromiseRejectionTracker({ allRejections: true, onUnhandled, onHandled })`；不可用则跳过。
2. Hermes **全局仅一个** tracker：本安装覆盖引擎默认/开发态钩子是可接受的产品权衡；采集侧 `onUnhandled` 上报后不阻断 App。
3. `onHandled` 可空实现（晚挂 `.catch` 的误报窗口接受引擎默认延迟行为）。

#### 4.6.3 农屿网络 / API

1. **范围**：`API_BASE_URL` 上的 `appFetch` 与 `appAuth`（login / me / logout）。教务、二课、其它裸 `fetch` **不**采。
2. **Track transport 不采**（§3）。
3. 抽内部 `reportAppRequestError`（或等价）供 `appFetch` / `appAuth` / `parseApiResponse` 调用；**不得**改变原有抛错语义（上报后仍 throw，业务 catch / Toast / 清会话逻辑不变）。
4. **降噪**：`network` / `api` 按 key=`${method}|${path}|${code|network}` **60s 内最多入队 1 条**；`fatal` / `js` / `react` / `unhandled_rejection` **不**做该限流。
5. `path` 只保留 pathname（去掉 query）；禁止把 Authorization / body / Token 写入 `props`。

## 5. 业务流程

```text
登录/冷启动恢复 Token
  → app_open + 启动 flush/心跳
  → 路由变化 → screen_view enter + 开表
  → 切路由 / 进后台 / 登出 → screen_view leave（duration_ms，≥300ms）
  → 回前台同页 → 续开计时（不再 enter）
  → 重点按钮 → button_click
  → ErrorUtils → crash fatal|js
  → ErrorBoundary → crash react + 降级 UI
  → 未处理 Promise → crash unhandled_rejection
  → appFetch/appAuth 失败 → crash network|api（限流）仍 throw
登出
  → 结算停留 → flush + offline → 停定时器 → 清会话
```

## 6. 验收与测试

见 [`联调指南-埋点.md`](../联调指南-埋点.md)「测试方法」：

1. 本机 Track `/health` 为 `ok`，端口 8082（避开 Metro）。
2. 已登录 App 切 Tab，Metro `[HTTP]` 出现 `POST .../v1/track/events` 且 `ok: true`。
3. 切 Tab 停留数秒后再切：批次中可见同 pathname 的 `screen_view`：一条无 `duration_ms`（`props.phase=enter`），一条带 `duration_ms`（`phase=leave`，`reason=route`）。
4. 进后台再回前台：离开时有 leave；回前台**无**新的 enter；再切走时 leave 的 `duration_ms` 大致为前台可见段之和（不含后台）。
5. 重复上报同一 `event_id` 服务端 `duplicated ≥ 1`（SDK 正常路径不主动重发成功事件）。
6. 登出后 Track/Node 在线态可置 0（或 10 分钟内超时）；登出前应尽量带上当前页 leave。
7. 无 Token 时不发起上报。
8. **错误扩边（已登录）**：
   - 临时在某屏 `throw new Error("boundary-test")`：见降级 UI；批次含 `crash`/`react`；点「重试」后可恢复（去掉 throw 后）。
   - `Promise.reject(new Error("rej-test"))` 且无 catch：批次含 `crash`/`unhandled_rejection`。
   - 断网后触发 `appFetch`：批次含 `crash`/`network`（有 Token 时）；业务错误态仍出现。
   - 故意打一个会返回非 0 `code` 的接口：批次含 `crash`/`api` 且 props 含 `code`；60s 内同 path+code 重复触发只多 1 条。
   - Track 服务关掉时：业务 `appFetch` 仍可报 `network`/`api`；Track transport 失败不产生额外 crash 环。

---

## 7. 修订记录

| 日期       | 说明                                                                                                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-15 | 初版实现                                                                                                                                                          |
| 2026-08-15 | 产品决策：本版不做原生层崩溃；边界与目标文案同步                                                                                                                  |
| 2026-08-16 | 回链 as-built 技术方案 `tech/自研埋点SDK一期.md`                                                                                                                  |
| 2026-08-16 | 页面可见停留：enter + leave（`duration_ms`）；后台停表；&lt;300ms 过滤；Admin 聚合后置                                                                            |
| 2026-08-16 | 错误采集扩边：根 ErrorBoundary、`unhandled_rejection`、`appFetch`/`appAuth` 的 `network`/`api`；仍用 `crash` + event_name；60s 降噪；不采第三方与 Track transport |
| 2026-08-16 | 错误采集扩边编码落地                                                                                                                                              |
