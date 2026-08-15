# Spec：自研埋点 SDK 一期

| 项       | 内容                                                                                                                                                            |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 应用     | `apps/nongyu-rn-app`                                                                                                                                            |
| 需求类型 | **基建**                                                                                                                                                        |
| PRD      | `docs/forhuman/rawprds/nongyu-rn-app/User/埋点及用户交互PRD.md`（仅埋点采集；不含建议反馈）                                                                     |
| 状态     | **已实现**（2026-08-15）                                                                                                                                        |
| 契约     | [`../nongyu-go-track-server/接口文档.md`](../nongyu-go-track-server/接口文档.md)、[`技术选型.md`](../技术选型.md) §6、[`联调指南-埋点.md`](../联调指南-埋点.md) |

---

## 1. 背景

Track HTTP 已可本机联调，但 RN 只有 `TRACK_BASE_URL`，没有采集 / 队列 / 上报。需要按选型落地自研 Telemetry，用与业务登录同一颗 App JWT 直连 Track，支撑页面频次、重点按钮、在线/DAU、JS 故障与后续性能点。

## 2. 目标

1. 已登录用户自动上报：`app_open`、全局 `screen_view`、周期 `heartbeat`；登出尽力 `presence/offline`。
2. 提供 `track` / `trackClick` / `measure` 给业务显式调用；一期接入底栏 Tab、农屿 AI、退出登录、首页教务/二课入口。
3. 内存队列 + 定时/满批 flush；失败写入 MMKV，依赖服务端 `event_id` 幂等重试。
4. JS 全局异常打 `crash`（一期）；原生崩溃二期。
5. **不**走 Node `appFetch` 信封；成功以 Track `{ ok: true }` 为准。

## 3. 边界（非目标）

- 不覆盖建议/反馈（PRD「用户交互」段，走广场发帖）。
- 不实现原生崩溃、不接商用 APM。
- 不把课表/列表耗时在本期强制打满；只提供 `measure`，课表页后续自行调用。
- 不做可追踪 HOC 组件库（一期用函数 API + 少量重点按钮）。
- 不接管理端 BFF；App 禁止打 Track Admin API。
- 未登录（无 App JWT）不上报。
- **跳过独立 tech / plans**：HTTP 契约与选型已锁定，以本 Spec 指导实现。

## 4. 详细需求

### 4.1 模块位置

`src/modules/telemetry/`，公开入口 `src/modules/telemetry/index.ts`。

### 4.2 事件与字段

字段 **snake_case**，对齐 Track 接口文档 §4.1。`user_id` 不传。`event_id` 客户端 UUID。公共上下文：`session_id`（一次 JS 运行时）、`app_version`、`platform`（仅 `ios`/`android`）、`device_brand`。

| event_type     | event_name 约定                                            | 触发                            |
| -------------- | ---------------------------------------------------------- | ------------------------------- |
| `app_open`     | 进程内首次 `cold_start`；再次拿到 Token 为 `session_start` | Token 从空变为有                |
| `screen_view`  | Expo Router `pathname`（无 query）                         | 已登录且路径变化；跳过 `/login` |
| `heartbeat`    | `heartbeat`                                                | 已登录后每 60s；前后台都发      |
| `button_click` | 稳定英文/路由名，如 `tab_home`、`nongyu_ai`、`logout`      | 显式 `trackClick`               |
| `perf`         | 调用方传入                                                 | `measure` / `measureAsync`      |
| `crash`        | `fatal` / `js`                                             | 全局 JS 异常                    |

`props` 禁止密码、Token、Cookie；超 4KB 由服务端截断。

### 4.3 传输

- `POST {TRACK_BASE_URL}/v1/track/events`，`Authorization: Bearer <App JWT>`
- 批大小 20～50（实现 **40**）；flush：队列达批、或 **10s** 定时、或登出前强制
- HTTP 503 / 429 / 网络失败：事件回写 MMKV 下次重试
- 无网（NetInfo）不发，只积压
- 队列上限 **300**，超出丢最旧
- `POST /v1/track/presence/offline`：登出在清 Token **之前** 调用（失败忽略，依赖服务端超时）

### 4.4 宿主

根布局在 `AuthRoot` 内挂 `TelemetryHost`：订阅 session Token、`usePathname`、`AppState`、心跳与 flush 定时器。

### 4.5 鉴权与在线

- Token 取 `getAppAccessToken()`（与业务同一颗）
- PRD：挂后台仍算在线 → `heartbeat` 在 `background` 也继续尝试（系统杀进程则靠 Track 超时）

## 5. 业务流程

```text
登录/冷启动恢复 Token
  → app_open + 启动 flush/心跳
  → 路由变化 → screen_view
  → 重点按钮 → button_click
  → 异常 → crash（入队 flush）
登出
  → 尽量 flush + offline → 停定时器 → 清会话
```

## 6. 验收与测试

见 [`联调指南-埋点.md`](../联调指南-埋点.md)「测试方法」：

1. 本机 Track `/health` 为 `ok`，端口 8082（避开 Metro）。
2. 已登录 App 切 Tab，Metro `[HTTP]` 出现 `POST .../v1/track/events` 且 `ok: true`。
3. 重复上报同一 `event_id` 服务端 `duplicated ≥ 1`（SDK 正常路径不主动重发成功事件）。
4. 登出后 Track/Node 在线态可置 0（或 10 分钟内超时）。
5. 无 Token 时不发起上报。
