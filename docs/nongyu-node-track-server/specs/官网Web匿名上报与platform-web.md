# Spec：Track · 官网 Web 匿名上报与 platform=web

| 项       | 内容                                                                      |
| -------- | ------------------------------------------------------------------------- |
| 应用     | `apps/nongyu-node-track-server`（契约：`packages/nongyu-track-contract`） |
| 需求类型 | **基建**                                                                  |
| 技术方案 | `docs/nongyu-web-site/tech/官网Web-Vitals-RUM技术方案.md`                 |
| 状态     | **已实现**                                                                |

---

## 1. 背景

官网需匿名上报 PV 与 Web Vitals。现网 ingest 强制 App JWT，`platform` CHECK 仅 `ios|android`。

## 2. 目标

1. 新口 `POST /v1/track/web/events`：Site Key + IP 限流，无 JWT。
2. 允许 `platform=web`；Web 口仅收白名单事件。
3. dims/overview 支持按 `platform`（及可选 name 前缀）过滤，供大屏隔离 App/Web。
4. Nginx CORS example 补齐（文档/example，非强制本仓库改服务器）。

## 3. 边界

- 不改 App JWT 上报路径行为
- 不触发 presence / usersync
- 不做 UV
- Go Track 若仍部署：本期以 Node Track 为准；Go 不同步除非另开需求

## 4. 详细需求

### 4.1 契约

- `platform`：`ios` | `android` | `web`
- Web 白名单：

| event_type    | event_name                                                 |
| ------------- | ---------------------------------------------------------- |
| `perf`        | `cwv_lcp` / `cwv_inp` / `cwv_cls` / `cwv_fcp` / `cwv_ttfb` |
| `screen_view` | `web_home`                                                 |

### 4.2 配置

| 变量                                   | 必填 | 说明                                           |
| -------------------------------------- | ---- | ---------------------------------------------- |
| `TRACK_WEB_SITE_KEY` 或 `WEB_SITE_KEY` | 否   | 空则 Web 口恒 401/403；有值则 timing-safe 比较 |

### 4.3 `POST /v1/track/web/events`

- Header：`X-Site-Key` 必填且匹配
- 插件：requestId + IP 限流 + Site Key（**无** appJwt）
- Body：`{ events: RawEvent[] }`，长度 1～20（可 ≤100 与 App 对齐，但建议文档写 1～20）
- 每条：`(event_type,event_name)` 必须在白名单；`platform` 缺省填 `web`，若显式传入必须为 `web`
- Writer：`userId=0`（落库 null）、`skipPresence=true`
- 响应：与 App ingest 相同 `{ accepted, duplicated, rejected, errors }`

### 4.4 Schema

- Migration：扩展 `events.platform` CHECK，允许 `'web'`（SQLite 重建表模式，对齐既有 llm_proxy_fail 迁移风格）。

### 4.5 Admin 查询

- `GET /v1/admin/metrics/dims`：新增可选 `platform`、`name_prefix`
  - `platform=web` 时 SQL 限制 `platform='web'`
  - `name_prefix=cwv_` 时 `event_name LIKE 'cwv_%'`
- `GET /v1/admin/overview`：新增 `web_screen_view_count`（当日 `event_type=screen_view` 且 `platform=web` 的条数；今日 live / 历史口径与现 overview 一致）

### 4.6 CORS（部署文档）

- 更新 Track nginx example：`/v1/track/web/` 的 Allow-Origin 白名单、OPTIONS 204、Allow-Headers 含 `X-Site-Key`

## 5. 验收

1. 正确 Key + `web_home` / `cwv_lcp` 可入库，`user_id` 空、`platform=web`。
2. 错误 Key、非白名单、`platform=android` 在 Web 口 → 拒绝。
3. dims `platform=web` 不含 App 课表 perf。
4. overview 含 `web_screen_view_count`。
5. 单测覆盖校验与 Web 口鉴权。

## 修订记录

| 日期       | 说明                     |
| ---------- | ------------------------ |
| 2026-08-31 | 首版，对齐已确认技术方案 |
