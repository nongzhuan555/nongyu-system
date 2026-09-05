# Spec：官网 · Web Vitals RUM 与访问量上报

| 项        | 内容                                                                   |
| --------- | ---------------------------------------------------------------------- |
| 应用      | `apps/nongyu-web-site`                                                 |
| 需求类型  | **基建**                                                               |
| 技术方案  | `docs/nongyu-web-site/tech/官网Web-Vitals-RUM技术方案.md`              |
| 上游 Spec | `docs/nongyu-node-track-server/specs/官网Web匿名上报与platform-web.md` |
| 状态      | **已实现**（含 2026-09-05：默认同源 URL + 可选运行时配置）             |

---

## 1. 背景

官网需 RUM（web-vitals）与每次进入的 PV，经跨域 beacon 写入 Track Web 口。

## 2. 目标

1. 进入/刷新页面上报 1 次 `screen_view` / `web_home`（100%）。
2. 采集 LCP/INP/CLS/FCP/TTFB → `perf` / `cwv_*`（100%）。
3. 统一 beacon 封装；失败不影响页面。

## 3. 边界

- 不做 UV、不做 query 采集、不做会话回放
- 不抽独立共享包（一期写在官网内）
- Site Key 允许进前端包

## 4. 详细需求

### 4.1 依赖与环境

- 依赖：`web-vitals`
- 上报 URL 解析顺序：`window.__NONGYU_RUM__.url` → `VITE_TRACK_WEB_URL` → **默认** `/v1/track/web/events`（同源，依赖官网 Nginx 反代 Track；见 `docs/nongyu-web-site/deploy/nongyu-web.nginx.conf.example`）
- Site Key 解析顺序：`window.__NONGYU_RUM__.siteKey` → `VITE_TRACK_WEB_SITE_KEY`
- **Site Key 为空则跳过全部上报**（URL 已有默认值，不再因 URL 空而静默跳过）
- 未配置时 console 提示一次（dev/prod 均可，便于排查）
- 可选运行时：`/rum-config.js`（部署覆盖，模板见 `public/rum-config.example.js`），须在主入口 module 之前加载

### 4.2 模块

| 模块                   | 职责                                               |
| ---------------------- | -------------------------------------------------- |
| `src/rum/beacon.ts`    | `sendBeacon` / `fetch keepalive` + `X-Site-Key`    |
| `src/rum/session.ts`   | `session_id`（sessionStorage）、`event_id`（UUID） |
| `src/rum/pageView.ts`  | 启动上报 PV                                        |
| `src/rum/webVitals.ts` | 动态 import web-vitals，映射 cwv_*                 |

`main.ts` 尽早 `pageView()`；web-vitals 可随后注册。

### 4.3 PV 口径

- 每次完整加载/刷新 +1；SPA 同生命周期不重复
- `platform: "web"`，`app_version`：可用 `import.meta.env` 构建时间戳或固定 `"web-site"`

### 4.4 CWV 映射

| Metric           | event_name | duration_ms                                   |
| ---------------- | ---------- | --------------------------------------------- |
| LCP/INP/FCP/TTFB | `cwv_*`    | round(ms)                                     |
| CLS              | `cwv_cls`  | round(score×1000)；`props.raw_value` 存原始分 |

`props`：`rating`、`navigation_type`、`path`（仅 pathname）、可选 metric `id`。  
默认最终值上报（不 `reportAllChanges`）。

### 4.5 上报

- 优先带 Header 的 keepalive `fetch`；或经实测可用的 `sendBeacon` 方案（实现选定一种主路径并文档化）
- Content-Type：`application/json`；body `{ events: [...] }`
- 错误静默

## 5. 验收

1. 配置 Site Key 且官网 Nginx 反代 `/v1/track/web/` 时：刷新官网，Track 出现 `web_home`；加载后出现 cwv_*；大屏 PV / Web Vitals 有数。
2. 仅缺 Site Key：页面正常、控制台一次 warn、无上报请求或请求不带有效 Key。
3. 不影响首屏可交互（动态 import web-vitals）。
4. 未配 Nginx 反代时同源 `/v1/track/web/events` 会失败——部署检查清单须含反代。

## 修订记录

| 日期       | 说明                                                              |
| ---------- | ----------------------------------------------------------------- |
| 2026-08-31 | 首版                                                              |
| 2026-09-05 | URL 默认同源；支持 `__NONGYU_RUM__` / `rum-config.js`；Key 仍必填 |
