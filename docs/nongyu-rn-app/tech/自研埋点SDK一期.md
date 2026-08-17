# 技术方案：自研埋点 SDK 一期（RN Telemetry）

> 状态：**as-built（对照已上线实现整理，供学习）**  
> 需求归类：**基建**  
> 应用：`apps/nongyu-rn-app`  
> Spec：[`../specs/自研埋点SDK一期.md`](../specs/自研埋点SDK一期.md)  
> 服务端 tech：[`../../nongyu-go-track-server/tech/埋点服务技术方案.md`](../../nongyu-go-track-server/tech/埋点服务技术方案.md)  
> 契约：[`../../nongyu-go-track-server/接口文档.md`](../../nongyu-go-track-server/接口文档.md)  
> 联调：[`../联调指南-埋点.md`](../联调指南-埋点.md)  
> 选型：[`../技术选型.md`](../技术选型.md) §6  
> 概念与业界对照（学习向）：[`埋点知识与农屿实战.md`](./埋点知识与农屿实战.md)

一期实现时 Spec 写明「跳过独立 tech」；本文按 **2026-08 落地代码** 补写，侧重 **HOW**（模块职责、数据流、关键决策），不替代 Spec 的 WHAT/验收。

---

## 1. 技术选型

| 项         | 结论                                               | 原因                                                            |
| ---------- | -------------------------------------------------- | --------------------------------------------------------------- |
| 形态       | App 内模块 `src/modules/telemetry/`，非独立 npm 包 | 一期只需直连 Track；与会话 Store / MMKV 同进程，少一层包边界    |
| 上报通道   | `fetch` 直连 `TRACK_BASE_URL`                      | 不走 Node `appFetch` 信封；成功判据是 Track `{ ok: true }`      |
| 鉴权       | 与业务同一颗 App JWT（`getAppAccessToken`）        | Track 与 Node 共用 `JWT_SECRET` 校验；无 Token 无法鉴权则不上报 |
| 本地队列   | MMKV（`appStorage`）键 `telemetry:pending_v1`      | 冷启动可恢复；失败批次保留原 `event_id` 以便服务端幂等          |
| 网络门闩   | `@react-native-community/netinfo`                  | 无网不发、只积压，避免无意义失败                                |
| 设备上下文 | `expo-application` + `expo-device` + `Platform`    | `app_version` / `device_brand` / `ios\|android`                 |
| 会话 ID    | 进程内一次 `newEventId()`                          | 一次 JS 运行时一条；冷启动进程重建后更换                        |
| 崩溃       | 仅 `ErrorUtils.setGlobalHandler` 包一层            | 产品决策：本版不做原生崩溃 / 商用 APM                           |
| 页面浏览   | `TelemetryHost` + `usePathname`                    | 选型要求全局自动 `screen_view`，禁止每页手写                    |
| 按钮       | 显式 `trackClick`，**未做**可追踪 HOC              | 一期 Spec 边界：函数 API + 少量重点按钮                         |

环境变量：`EXPO_PUBLIC_TRACK_BASE_URL`（默认本机 `http://127.0.0.1:8082`，避开 Metro 8081）。

---

## 2. 总体架构

```text
                    ┌──────────────────────────────────────┐
  业务调用           │  index.ts 公开 API                    │
  track / trackClick │  track · trackClick · measure*        │
  measure / measure* └──────────────┬───────────────────────┘
                                    │ enqueue(input)
                                    ▼
┌─────────────┐   补全字段    ┌─────────────────┐   MMKV    ┌──────────────┐
│ context.ts  │──────────────►│ client.ts       │◄─────────►│ queue.ts     │
│ session/设备│               │ sanitize + 入队 │           │ pending_v1   │
└─────────────┘               │ flushPending    │           │ 上限 300     │
                              └────────┬────────┘           └──────────────┘
                                       │ batch 40
                                       ▼
                              ┌─────────────────┐
                              │ transport.ts    │──► POST /v1/track/events
                              │ + offline       │──► POST /v1/track/presence/offline
                              └─────────────────┘
                                       ▲
         ┌─────────────────────────────┼─────────────────────────────┐
         │                             │                             │
┌────────────────┐           ┌─────────────────┐           ┌────────────────┐
│ TelemetryHost  │           │ crash.ts        │           │ 登出路径        │
│ app_open       │           │ ErrorUtils      │           │ trackClick     │
│ screen_view    │           │ + Promise       │           │ + shutdown     │
│ heartbeat 60s  │           │ → crash 入队    │           └────────────────┘
│ flush 10s      │           └────────┬────────┘
└────────────────┘                    │
                     AppErrorBoundary │ reportAppRequestError
                     (react)          │ (appFetch / appAuth → network|api)
```

**与业务后端的关系**：Telemetry **不**经 `nongyu-node-server` 转发事件正文；心跳落到 Track 后，由 Track **回写** Node 的在线态（见服务端方案）。App 只负责发事件 / 显式 offline。

---

## 3. 模块职责（对照源码）

| 文件                | 职责                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| `index.ts`          | 对外 API：`track` / `trackClick` / `measure` / `measureAsync`；再导出 Host、crash、flush、类型 |
| `types.ts`          | `TrackEvent` / `TrackEventInput` / `event_type` 枚举；字段 **snake_case** 对齐 Track           |
| `ids.ts`            | `event_id` / `session_id`：优先 `crypto.randomUUID`，否则 RFC4122 v4 手搓                      |
| `context.ts`        | 进程级 `session_id` + `app_version` / `platform` / `device_brand`                              |
| `queue.ts`          | MMKV 读写；追加 / 取批 / 失败插回队头；超 300 丢最旧                                           |
| `client.ts`         | `enqueue`（无 JWT 丢弃）、`flushPending`、`shutdownForLogout`、`props` 敏感键过滤              |
| `transport.ts`      | 直连 Track 的 HTTP；解析 `{ ok: true, data }`                                                  |
| `TelemetryHost.tsx` | 已登录驱动：`app_open`、`screen_view` enter/leave、心跳、定时 flush、AppState                  |
| `screenDwell.ts`    | 可见停留状态机：开表 / 结算 leave / 后台续计                                                   |
| `crash.ts`          | 全局 JS + Hermes 未处理 Promise → `crash`；保留原 ErrorUtils handler（红屏不丢）               |
| `AppErrorBoundary`  | 根 Boundary：`react` 上报 + 降级 UI「重试」                                                    |
| `reportRequest.ts`  | 农屿 `network`/`api` 入队 + 60s 降噪；供 `appFetch` / `appAuth` / `parseApiResponse`           |
| `reportCrash.ts`    | 统一 `reportCrash` / `crashPropsFromUnknown`                                                   |

挂载点（`app/_layout.tsx`）：

1. 模块加载时 `installCrashTracking()`（尽早包住后续 JS + Promise）
2. `AuthRoot` 内挂 `<TelemetryHost />`（能读到 session hydration + Token）
3. 根树挂 `<AppErrorBoundary>`（仅一层）

---

## 4. 事件模型与触发

### 4.1 类型与命名

| event_type     | event_name 约定                                                      | 谁触发                             |
| -------------- | -------------------------------------------------------------------- | ---------------------------------- |
| `app_open`     | 进程内首次 `cold_start`；再次有 Token 为 `session_start`             | Host：`canTrack` 变真              |
| `screen_view`  | Expo Router `pathname`（无 query）                                   | Host：enter + leave（见下）        |
| `heartbeat`    | 固定 `heartbeat`；可带 `props.app_state`                             | Host：60s 定时 + active/background |
| `button_click` | 稳定英文名，如 `tab_home`、`logout`                                  | 业务 `trackClick`                  |
| `perf`         | 调用方传入，如 `course_week_first_paint`                             | `track` / `measure*`               |
| `crash`        | `fatal` / `js` / `react` / `unhandled_rejection` / `network` / `api` | 见 §5.5                            |

`screen_view`：进入无 `duration_ms`（`props.phase=enter`）；离开带 `duration_ms`（`phase=leave`，`reason`：`route` / `background` / `logout` / `teardown`）；`duration_ms < 300` 不上报。后台结算后回前台同 path 只续开计时、不重复 enter。

完整上报体在 `enqueue` 内组装：`event_id`、`client_ts_ms`、公共上下文 + 可选 `duration_ms` / `props`。**不传 `user_id`**（服务端从 JWT 解析）。

### 4.2 一期已接线的业务点

| 场景     | event_name                                                          |
| -------- | ------------------------------------------------------------------- |
| 底栏 Tab | `tab_home` / `tab_course` / `tab_center` / `tab_mine`               |
| 农屿 AI  | `nongyu_ai`                                                         |
| 首页入口 | `entry_jiaowu` / `entry_second`                                     |
| 登出     | `logout`                                                            |
| 分享     | `share_open` / `share_wechat` / `share_moments` / `share_copy_link` |
| 课表首屏 | `perf` + `course_week_first_paint`（仅本人模式）                    |

`measure` / `measureAsync` 已实现，业务侧除课表直接 `track({ event_type: "perf", ... })` 外，**尚无其它调用点**。

---

## 5. 关键路径详解

### 5.1 入队（enqueue）

```text
业务 / Host / crash
  → 无 App JWT？静默 return
  → newEventId + getTrackContext + Date.now
  → sanitizeProps（过滤 password/token/cookie/authorization 等键）
  → appendQueue → MMKV
```

设计要点：埋点失败不得抛回业务；未登录不上报（与 Spec「无 JWT 不上报」一致）。

### 5.2 刷出（flushPending）

```text
已有 flush 进行中？return
无 JWT？return
NetInfo 显示未连接？return
loop:
  takeBatch(40)
  空则结束
  postTrackEvents(batch)
    成功 → 继续下一批
    失败 → prependQueue(原 batch) → 结束（保留 event_id）
```

触发源：

- Host：登录后立刻、每 10s、每次心跳、AppState 变化
- crash：异常后尽力 flush
- 登出：`shutdownForLogout` 先结算页停留，再 flush，再 offline

### 5.3 登录会话生命周期（Host）

```text
session.hydrated && token
  → app_open（进程标志 processDidOpen 防 Strict Mode 双 cold_start）
  → flush
  → 订阅 pathname
       · 新 path → 结算上一页 leave → enter + beginScreenDwell
       · 进 /login → 结算 leave
  → 启 10s flush + 60s heartbeat
  → AppState background → settle leave（停表留 path）+ heartbeat + flush
  → AppState active → resumeScreenDwell + heartbeat + flush

token 清空 / 未 hydrated
  → settle teardown、清 lastPath、停定时器
```

后台仍发心跳：对齐 PRD「挂后台仍算在线」；**页面停留只计可见时长**。进程被杀后靠 Track 超时离线。

### 5.4 登出

```text
performJiaowuLogout
  → trackClick("logout")
  → await shutdownForLogout()
       · settleScreenDwell("logout") → enqueue leave
       · flushPending（吞错）
       · postTrackOffline（吞错；失败靠约 10 分钟超时）
  → 再清会话 / Token
```

顺序约束：**停留结算 / offline / 最后一批事件必须在清 Token 之前**，否则 transport 拿不到 Bearer。

### 5.5 错误采集（JS / React / Promise / 农屿请求）

```text
ErrorUtils.setGlobalHandler
  → enqueue crash（fatal | js；message + stack 截断 2048）
  → void flushPending()
  → previous handler（保留红屏）

Hermes enablePromiseRejectionTracker
  → onUnhandled → enqueue crash（unhandled_rejection）

AppErrorBoundary.componentDidCatch
  → enqueue crash（react；+ component_stack）
  → 降级 UI「重试」reset

appFetch / appAuth / parseApiResponse
  → reportAppRequestError（network | api；60s 同 key 降噪）
  → 仍 throw（业务语义不变）
  → Track transport 失败不报
```

采集自身再抛会导致死循环，故整段 try/catch 吞掉。

---

## 6. 传输与错误语义

| 接口                                    | 用途                                                               |
| --------------------------------------- | ------------------------------------------------------------------ |
| `POST {TRACK_BASE_URL}/v1/track/events` | Body `{ events: TrackEvent[] }`，`Authorization: Bearer <App JWT>` |
| `POST .../v1/track/presence/offline`    | Body `{}`，登出尽力通知                                            |

成功：HTTP ok 且 JSON `ok === true`，返回 `accepted / duplicated / rejected`。  
失败：抛错 → 批次回队；**不**在客户端解析业务 `code/message` 信封。

与 Node 的差异（学习时易混）：

|            | Node 业务 API  | Track                     |
| ---------- | -------------- | ------------------------- |
| 客户端封装 | `appFetch` 等  | `transport.ts` 裸 `fetch` |
| 成功形态   | 项目内业务信封 | `{ ok: true, data }`      |
| Base URL   | `API_BASE_URL` | `TRACK_BASE_URL`          |

---

## 7. 队列与可靠性

| 策略     | 取值 / 行为                                                 |
| -------- | ----------------------------------------------------------- |
| 持久化   | MMKV JSON 数组                                              |
| 批大小   | 40                                                          |
| 队列上限 | 300；超出丢**最旧**（append）或裁队尾（prepend 失败回插时） |
| 幂等     | 客户端 `event_id` UUID；失败重试不换 ID                     |
| 损坏数据 | `loadQueue` 解析失败则删键，避免永久卡死                    |
| 无网     | 只积压不发送                                                |

权衡：上限丢旧事件换磁盘与重试可控；分析侧容忍少量丢失，优先不拖垮客户端。

---

## 8. 安全与隐私

- `props` 黑名单键（大小写不敏感）：`password` / `pwd` / `token` / `accesstoken` / `refreshtoken` / `cookie` / `authorization`
- 事件体不带 Token；Token 只在 HTTP Header
- crash 的 `stack` 截断，降低体积与偶然敏感信息面
- App **禁止**调用 Track Admin API（管理端经 Node BFF，客户端无入口）

---

## 9. 与选型文档的差异（实现落点）

| 选型 §6 表述           | 一期实际                                                                        |
| ---------------------- | ------------------------------------------------------------------------------- |
| 可追踪封装组件 / HOC   | **未做**；显式 `trackClick`                                                     |
| Error Boundary → crash | 根 `AppErrorBoundary` → `react`                                                 |
| Promise 未处理         | Hermes tracker → `unhandled_rejection`                                          |
| 农屿网络 / API 失败    | `appFetch`/`appAuth` → `network`/`api` + 60s 降噪；不采第三方与 Track transport |
| 列表页渲染耗时         | **未接**；仅课表首屏 `perf`                                                     |
| 内存队列 + MMKV 重试   | 实现为 **以 MMKV 为权威队列**（每次 append/take 读写），非「先内存再落盘」双层  |

阅读代码时以本表 + Spec 边界为准，避免按选型字面找不存在的 HOC。

---

## 10. 实现地图（已完成，供对照代码）

1. `types` / `ids` / `context` → 事件形状与公共字段
2. `queue` + `client` + `transport` → 入队 / flush / HTTP
3. `TelemetryHost` + 根布局挂载 → 自动生命周期事件
4. `crash` 安装 → JS / Promise；根 `AppErrorBoundary` → `react`
5. `reportAppRequestError` → `appFetch` / `appAuth` 的 `network` / `api`
6. 业务点：Tab、AI、入口、登出、分享、课表首屏
7. 联调：见联调指南（Track 8082、同 `JWT_SECRET`）

后续若扩事件：优先 `trackClick` / `track({ event_type: "perf", ... })`；新 `event_type` 须先改 Track 契约再改 `TRACK_EVENT_TYPES`。

---

## 11. 注意事项

1. **埋点不得阻断主流程**：enqueue/flush/offline/crash 路径均吞错或 void。
2. **清 Token 前完成 shutdown**：否则最后一批与 offline 会因无 JWT 失败/跳过。
3. **真机联调**：`TRACK_BASE_URL` 用局域网 IP 或隧道；Android 模拟器用 `10.0.2.2:8082`。
4. **Strict Mode**：`processDidOpen` 防止双 `cold_start`；`session_start` 仍可能在 Token 再次就绪时出现。
5. **课表 perf**：peer / loading / error 时不报，避免脏耗时。
6. **服务端文档**：容量、聚合、在线回写读 Go Track tech，不在本文展开。

---

## 12. 修订记录

| 日期       | 说明                                                            |
| ---------- | --------------------------------------------------------------- |
| 2026-08-16 | 按已实现代码补写 as-built 技术方案，供学习对照                  |
| 2026-08-16 | 补充页面可见停留：`screenDwell` + enter/leave；Admin 聚合仍后置 |
