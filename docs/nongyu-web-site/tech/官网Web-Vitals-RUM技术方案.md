# 技术方案：官网 Web Vitals RUM → Track → 管理端大屏

| 项       | 内容                                                                                                             |
| -------- | ---------------------------------------------------------------------------------------------------------------- |
| 需求类型 | **基建**                                                                                                         |
| 涉及应用 | `nongyu-web-site`、`nongyu-node-track-server`、`nongyu-node-server`、`nongyu-web-admin`、`nongyu-track-contract` |
| 状态     | **已实现**                                                                                                       |
| 决策来源 | 2026-08-31 对话：Q1–Q4/Q0 按建议；采样 100%；`web-vitals` + `sendBeacon`；增补官网访问量 PV                      |

---

## 1. 背景与目标

### 1.1 背景

- 官网已上线，需用 Google [`web-vitals`](https://github.com/GoogleChrome/web-vitals) 做 **RUM**（真实用户）性能观测。
- 仓库已有 Track（Node/SQLite）：`event_type=perf`、日聚合 `perf_p50` / `perf_p95`、管理端经 Node BFF 代理、大屏已有 App 侧「关键性能」卡。
- 缺口：上报强制 **App JWT**；`platform` 仅 `ios|android`；官网匿名、且与 Track **跨域**。

### 1.2 目标

1. 官网上报 Core Web Vitals + FCP/TTFB，**采样 100%**，经 `sendBeacon`（失败降级 `fetch keepalive`）写入 Track。
2. 用户进入官网时上报 **访问量（PV）**，大屏可查看当日/分布（与 App 页面浏览隔离）。
3. Track 支持匿名 Web 上报（Site Key + 限流），`platform=web`，复用 `perf` / `screen_view` 聚合能力。
4. 管理端数据大屏新增 **Web Vitals 看板** + **官网访问 KPI**（与 App `chart-perf` / 页面使用卡隔离）。
5. 跨域由 **Track 入口 Nginx CORS**（可辅以应用层）正确放行。

### 1.3 非目标（一期）

- 会话回放、sourcemap、长任务/资源 timing 明细
- 按 URL query / 用户身份追溯（不采 PII）
- 与 App 共用采样率配置中心
- 抽独立 `nongyu-web-rum` 包（一期直接写在官网）

---

## 2. 已确认决策

| 项       | 结论                                                                                     |
| -------- | ---------------------------------------------------------------------------------------- |
| 鉴权     | Track 新口 `POST /v1/track/web/events` + `X-Site-Key` + IP 限流                          |
| 事件     | 复用 `event_type: "perf"`；`event_name` 前缀 `cwv_*`                                     |
| 指标     | LCP / INP / CLS / FCP / TTFB                                                             |
| 大屏     | 独立 Web Vitals 卡，不与 App 性能卡混展示                                                |
| 采样     | **100%**                                                                                 |
| 上报     | `web-vitals` + 封装 `sendBeacon`（`fetch keepalive` 降级）                               |
| CORS     | 官网 → Track 跨域；**Nginx 配置 CORS**（见 §5）                                          |
| 访问量   | 复用 `event_type: "screen_view"`，`event_name: "web_home"`；进入官网上报 1 次（见 §6.5） |
| 访问大屏 | KPI「今日官网访问」+ 可选趋势；数据按 `platform=web` 过滤，不与 App 页览混算             |

---

## 3. 总体架构

```text
nongyu-web-site (Origin A)
  ① 进入页面 → screen_view / web_home（PV，100%）
  ② web-vitals → perf / cwv_*（RUM，100%）
       │ sendBeacon / fetch keepalive
       ▼
Nginx (Track 公网入口) · CORS · OPTIONS · 反代 · limit_req
       ▼
nongyu-node-track-server  POST /v1/track/web/events
  Site Key → 白名单（cwv_* + web_home）→ SQLite（user_id 可空）
       ▼
聚合：perf_p50/p95；screen_views（查询侧 platform=web）
       ▼
Node BFF  dims/overview 透传 platform=web
       ▼
Web Admin 大屏：kpi-web-pv + chart-web-vitals
```

---

## 4. 技术选型

| 层        | 选型                          | 说明                                      |
| --------- | ----------------------------- | ----------------------------------------- |
| 采集      | `web-vitals`（npm）           | 官方口径；动态 `import()` 避免阻塞首屏    |
| 上报      | `sendBeacon` + keepalive 降级 | 页面卸载仍尽量送达                        |
| 契约      | `nongyu-track-contract`       | 扩展 `platform`；约定 `cwv_*` 与 props    |
| 存储/聚合 | 现有 Track SQLite + jobs      | 少造轮子                                  |
| 大屏      | 现有 ECharts + Bento 网格     | 新增卡片 id，布局版本可 bump              |
| CORS      | Nginx（主）                   | 与现网 Track 部署一致；应用层可做开发兜底 |

---

## 5. 跨域（CORS）说明与 Nginx 方案

### 5.1 是否跨域？

**是。** 只要官网 Origin（协议+域名+端口）与 Track 上报 URL 的 Origin 不同，浏览器即按跨域处理。例如：

- 官网：`https://nongyu.example`
- Track：`https://track.nongyu.example` 或公网 IP HTTPS

同源（同域同端口反代到 Track）才可避免 CORS；当前独立 Track 机部署下默认跨域。

### 5.2 能否用 Nginx 配 CORS？

**可以，且推荐在 Nginx 配。** 现有 `docs/nongyu-go-track-server/deploy/nongyu-track.nginx.conf.example` **尚未含 CORS**，一期需增补 example。

要点：

1. **`Access-Control-Allow-Origin`**：写死官网 Origin（或按 `$http_origin` 白名单回显），**不要**对带鉴权头的接口无脑 `*` 搭配自定义头。
2. **`Access-Control-Allow-Methods`**：`POST, OPTIONS`。
3. **`Access-Control-Allow-Headers`**：至少 `Content-Type`、`X-Site-Key`、`X-Request-Id`（若使用）。
4. **`OPTIONS` 预检**：对 `/v1/track/web/` 直接 `return 204`，并带上 CORS 头（勿把预检打进业务限流打爆，可单独 `location`）。
5. **`Access-Control-Max-Age`**：可选，降低预检频率。
6. **不需要** `Allow-Credentials`（一期不上 Cookie）。

示意（需按真实官网 Origin 替换）：

```nginx
# 仅示意：挂在 Track HTTPS server 内
map $http_origin $track_cors_origin {
    default "";
    "https://YOUR_SITE_ORIGIN" $http_origin;
    "http://localhost:5174" $http_origin;   # 本地预览可选
}

location /v1/track/web/ {
    if ($request_method = OPTIONS) {
        add_header Access-Control-Allow-Origin $track_cors_origin always;
        add_header Access-Control-Allow-Methods "POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, X-Site-Key, X-Request-Id" always;
        add_header Access-Control-Max-Age 86400 always;
        add_header Content-Length 0;
        add_header Content-Type text/plain;
        return 204;
    }

    add_header Access-Control-Allow-Origin $track_cors_origin always;
    add_header Access-Control-Expose-Headers "X-Request-Id" always;

    limit_req zone=nongyu_track_ip burst=50 nodelay;
    proxy_pass http://127.0.0.1:8081;  # 以现网 Track 端口为准
    # ... 其余 proxy_set_header 同现网 ...
}
```

### 5.3 与 `sendBeacon` / 自定义头的关系

- 使用 **`X-Site-Key` 自定义头** 时，浏览器会对跨域 POST 先发 **OPTIONS 预检**；Nginx 必须正确响应，否则 beacon 失败。
- `sendBeacon` 对响应体几乎不可读，但仍要求 CORS 成功，否则发送会被浏览器拦截。
- 备选（降低预检）：Site Key 放 JSON body、`Content-Type: text/plain`——一期仍建议 **Header + 完整 CORS**，语义更清晰。

### 5.4 应用层 CORS？

Fastify 也可加 `@fastify/cors`，便于本地直连 `:8081`。生产以 **Nginx 为准**，避免双层不一致；若双开，Allow-Origin 白名单必须一致。

---

## 6. 契约与字段

### 6.1 `platform`

扩展为：`ios` | `android` | `web`（校验与 SQLite CHECK / 文档同步；Go 遗留若仍在线需评估是否双写，**以 Node Track 为准**）。

### 6.2 Web ingest 白名单

**性能（`event_type: "perf"`）**

| name       | 指标 | `duration_ms`                         |
| ---------- | ---- | ------------------------------------- |
| `cwv_lcp`  | LCP  | 毫秒（取整）                          |
| `cwv_inp`  | INP  | 毫秒（取整）                          |
| `cwv_cls`  | CLS  | `round(score * 1000)`（便于分位聚合） |
| `cwv_fcp`  | FCP  | 毫秒                                  |
| `cwv_ttfb` | TTFB | 毫秒                                  |

**访问（`event_type: "screen_view"`）**

| name       | 含义           | `duration_ms` |
| ---------- | -------------- | ------------- |
| `web_home` | 官网落地页进入 | 不传（仅 PV） |

Web 口按 `(event_type, event_name)` 双键白名单校验，禁止借 Web 口上报 App 任意 screen_view。

### 6.3 `props`（建议）

```json
{
  "rating": "good" | "needs-improvement" | "poor",
  "navigation_type": "navigate" | "reload" | "back_forward" | "prerender" | "...",
  "raw_value": 0.12,
  "path": "/",
  "id": "v3-metric-id"
}
```

- `raw_value`：CLS 存原始分数；其它指标可存原始毫秒。
- `path`：仅 pathname，**不含 query**。
- 单条 props 仍受现有 4KB 截断约束。

### 6.4 公共事件字段

与现网一致：`event_id`（UUID）、`event_type`、`event_name`、`client_ts_ms`、`session_id`（每标签页 `sessionStorage`）、`app_version`（官网构建号或固定站点版本串）、`platform: "web"`。  
`user_id` / `student_no`：Web 口写入为空。

### 6.5 官网访问量（PV）口径

| 项       | 约定                                                                                                                                |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 触发     | 官网 JS 主入口执行成功后立即上报 1 条 `screen_view` / `web_home`（与 web-vitals 独立）                                              |
| 计数     | **每次完整进入/刷新页面记 1 PV**（F5、重新打开均 +1）；同一 SPA 生命周期内不重复报                                                  |
| 非 UV    | 一期不做独立访客去重（无稳定匿名 ID）；大屏文案写「访问次数 / PV」，勿称 UV                                                         |
| 采样     | 100%，与性能一致                                                                                                                    |
| 聚合     | 走现有 `screen_views`（按 `event_name`）；**查询必须 `platform=web`**，避免与 App 页览相加                                          |
| overview | Track overview 可增 `webScreenViewCount`（当日 `platform=web` 且 `screen_view` 条数），或大屏用 dims 取 `web_home` 的 `metricValue` |

推荐实现：`sessionStorage` 仅用于稳定 `session_id`；**不**用 session 去重 PV（否则同标签多日打开只算一次，不符合「每次进入」）。

---

## 7. Track 服务改动

1. **配置**：`WEB_SITE_KEY`（或 `TRACK_WEB_SITE_KEY`）；空则拒绝 Web 口（安全默认关）。
2. **路由**：`POST /v1/track/web/events`
   - 插件：requestId + IP 限流 + Site Key 校验（**无** App JWT）
   - Body：与现网批量 events 对齐（`{ events: [...] }`），单批建议 ≤ 20
   - 仅接受 §6.2 双键白名单；`platform` 强制/校验为 `web`
   - 写入走现有 Writer；**不**触发 App presence
3. **校验**：`validate.ts` 允许 `platform=web`。
4. **聚合 / dims / overview**：
   - perf：查询加 `platform=web` 和/或 `name_prefix=cwv_`
   - screen_views：查询加 `platform=web`（大屏官网 PV 用 `web_home`）
   - overview：可选返回 `webScreenViewCount`
5. **单测**：Site Key、白名单、`web_home` 入库、拒绝非白名单 screen_view。

---

## 8. 官网改动（`nongyu-web-site`）

1. 依赖：`web-vitals`。
2. 模块建议：
   - `src/rum/beacon.ts`：统一 `sendBeacon` / keepalive
   - `src/rum/pageView.ts`：启动时上报 `screen_view` / `web_home`
   - `src/rum/webVitals.ts`：动态 import `web-vitals` → `cwv_*`
3. 在 `main.ts` 尽早调用 pageView（不阻塞 UI）；web-vitals 可微延迟/idle 注册。
4. 环境变量：`VITE_TRACK_WEB_URL`、`VITE_TRACK_WEB_SITE_KEY`（Site Key 进前端包，当可公开站点令牌）。
5. 采样 100%；失败静默。

---

## 9. Node BFF（`nongyu-node-server`）

1. `GET /api/admin/track/dims`：透传 `platform` / `namePrefix`。
2. `GET /api/admin/track/overview`：若 Track 返回 `webScreenViewCount` 则映射 camelCase 下发。
3. 接口文档概览同步。

---

## 10. 管理端大屏（`nongyu-web-admin`）

| 卡片 id            | 展示                                            | 数据                                                                                |
| ------------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| `kpi-web-pv`       | 大数字「今日官网访问」；辅文「PV · 不含 App」   | overview.`webScreenViewCount` 或 dims `screen_views` + `platform=web` 取 `web_home` |
| `chart-web-vitals` | 分组柱：各 `cwv_*` 的 p50 / p95；CLS 注明 ×1000 | `perf_p50`+`perf_p95` 且 `platform=web`                                             |

- 与现有 `chart-perf`、`chart-screen-views` **并列隔离**，默认布局追加 KPI + 图。
- 布局 version bump / merge 缺省卡。
- 空态文案区分「暂无官网访问」「暂无官网性能样本」。

---

## 11. 实现步骤（建议顺序）

1. Contract + Track 校验/`platform=web` + Web ingest + 单测
2. dims 过滤 + Nginx CORS example 更新
3. Node BFF 透传过滤参数
4. 官网 `web-vitals` + 上报封装 + env
5. Admin 新卡 + 布局
6. 联调：本地官网 → 带 CORS 的 Track → 大屏出数；再上生产 Nginx

---

## 12. 风险与注意

| 风险                          | 缓解                                               |
| ----------------------------- | -------------------------------------------------- |
| Site Key 暴露                 | 限流、白名单、可轮换；禁止写敏感逻辑               |
| CORS / 预检失败导致「无数据」 | 上线检查清单含 OPTIONS；文档写明官网 Origin        |
| CLS 与毫秒混轴                | 大屏文案标明 CLS 为×1000；或单独序列               |
| App/Web perf 同名污染         | 强制 `cwv_` 前缀 + dims `platform=web`             |
| sendBeacon + 自定义头兼容性   | 实现期用 Chrome/Safari 实测；必要时 keepalive 为主 |

---

## 13. 验收（技术方案层）

1. 跨域：官网 Origin 预检 OPTIONS 204，POST 带 `Access-Control-Allow-Origin`。
2. 进入官网 → Track 出现 `platform=web` + `screen_view`/`web_home`；刷新再进再 +1。
3. 真机产生 `cwv_*` 性能事件。
4. 错误 Site Key / 非白名单 → 拒绝且不入库。
5. 大屏：今日官网访问 KPI 有数；Web Vitals 卡出 p50/p95；App 页览/性能卡不被污染。
6. 采样：PV 与 CWV 均无随机丢弃。

---

## 14. 后续流程

- [x] **用户审查本技术方案**（含 CORS、PV）
- [ ] 通过后补 **Spec**（Track Web 上报 / 官网 RUM+PV / Admin 大屏）再实施计划与编码

---

## 修订记录

| 日期       | 说明                                             |
| ---------- | ------------------------------------------------ |
| 2026-08-31 | 首版：RUM + Nginx CORS                           |
| 2026-08-31 | 增补官网 PV：`screen_view`/`web_home` + 大屏 KPI |
