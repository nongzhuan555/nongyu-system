# Spec：数据大屏 · 官网访问与 Web Vitals

| 项        | 内容                                                               |
| --------- | ------------------------------------------------------------------ |
| 应用      | `apps/nongyu-web-admin`（BFF：`nongyu-node-server`）               |
| 需求类型  | **基建**                                                           |
| 技术方案  | `docs/nongyu-web-site/tech/官网Web-Vitals-RUM技术方案.md`          |
| 上游 Spec | Track Web 上报 Spec；既有 `数据大屏.md` / `管理端Track指标代理.md` |
| 状态      | **已实现**                                                         |

---

## 1. 背景

Track 将具备官网 PV 与 CWV；大屏需独立展示，不得与 App 页览/性能卡混算。

## 2. 目标

1. Node BFF 透传 `platform` / overview 的 `webScreenViewCount`。
2. 大屏新增 KPI「今日官网访问」与「官网 Web Vitals」图。
3. 与既有 `chart-screen-views`、`chart-perf` 隔离。

## 3. 边界

- 不改 App 既有卡语义
- 不做官网 UV、不做多日 PV 趋势（一期可只做当日 KPI；趋势若零成本可顺带用 track/trend，非必须）
- 不自动轮询（仍手动刷新）

## 4. 详细需求

### 4.1 BFF（`nongyu-node-server`）

- `GET /api/admin/track/dims`：Query 增加可选 `platform`、`namePrefix`，原样转 Track。
- `GET /api/admin/track/overview`：映射 Track `web_screen_view_count` → `webScreenViewCount`。
- 同步接口文档概览。

### 4.2 大屏卡片

| id                 | 标题            | 展示                                                     | 数据                                                               |
| ------------------ | --------------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| `kpi-web-pv`       | 今日官网访问    | 大数字 PV；辅文「官网进入次数」                          | `trackOverview.webScreenViewCount`                                 |
| `chart-web-vitals` | 官网 Web Vitals | 分组柱：cwv_* 的 p50/p95；CLS 注明单位为×1000 或换算展示 | 并行 `perf_p50`+`perf_p95`，`platform=web`（或 `namePrefix=cwv_`） |

- 空态：「暂无官网访问」「暂无官网性能样本」。
- 默认布局追加；prefs version bump 或缺省 id 时 merge。
- 色板沿用大屏现有。

### 4.3 失败隔离

Track 失败时：官网卡显示错误/空，不影响本库 KPI 与其它卡（与现逻辑一致）。

## 5. 验收

1. 有 Web 样本时：KPI 与 Web Vitals 图有数。
2. App 性能卡不出现 `cwv_*`；App 页面使用卡不因官网 PV 虚高（若未加 platform 过滤的旧请求不得用于官网卡）。
3. 窄屏网格可拖拽/缩放新卡。

## 修订记录

| 日期       | 说明 |
| ---------- | ---- |
| 2026-08-31 | 首版 |
