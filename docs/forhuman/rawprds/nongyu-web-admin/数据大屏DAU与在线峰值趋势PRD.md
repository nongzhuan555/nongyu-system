# 数据大屏：DAU 趋势与在线峰值 PRD

### 需求背景

管理端数据大屏已有「今日日活」「当前在线」，但看不到：

1. **今日最高同时在线**（当日采样峰值）；
2. **历史每日最高同时在线**（按日 `online_peak`）；
3. **历史每日日活**（按日 DAU）。

埋点侧已写入 `daily_metrics.online_peak`，BFF 已代理 `GET /api/admin/track/trend?metric=dau|online_peak`，大屏一期 Spec 将趋势列为非目标。本期补齐展示。

### 需求类型

业务需求（管理端大屏增强；Track overview 增补今日峰值字段，便于 KPI）。

### 已确认口径（按推荐）

- **范围**：新 KPI `kpi-online-peak`；新趋势卡 `chart-dau-trend`、`chart-online-peak-trend`。不做「区间最高 DAU」单独数字；不另做「最高日活」KPI（今日日活仍用现有 `kpi-dau`）。
- **今日峰值口径**：业务日当天 `max(daily_metrics.online_peak, 当前 Track user_presence 在线数)`，与 trend 今日 live 一致；辅文标明定时采样。
- **历史趋势**：两张独立平滑折线卡；区间与用户增长一致：`7d` / `30d` / `90d` / `180d` / `365d`；默认 `7d`；**两卡共用** prefs 字段 `trackTrendRange`。
- **数据**：overview 增补 `onlinePeak`；趋势走已有 `/api/admin/track/trend`。不新表、不改 RN 上报、不改采样任务本身。
- **触达**：Node Track + Go Track（overview 字段对齐）+ Node BFF map + Web Admin。
- **prefs**：`DashboardPrefsV1` 增补可选 `trackTrendRange`（同 `GrowthRange`）；缺省/非法 → `7d`；不 bump `version`。
- **加载**：进页/刷新与其它 Track 指标一并拉取；切换 `trackTrendRange` 只重拉两路 trend，两卡可共用 loading。

### 目标

1. 管理员一眼看到今日最高同时在线人数。
2. 可切换近 N 天查看每日 DAU、每日最高同时在线折线。
3. 空数据卡片空态清晰；Track 失败与本库 KPI 失败隔离（与现大屏一致）。

### 非目标

- 不做 MAU、不做「区间最高 DAU」独立 KPI。
- 不改同时在线采样频率与 presence 超时窗口。
- 不写独立技术方案文档。
- 不做图表 dataZoom。
