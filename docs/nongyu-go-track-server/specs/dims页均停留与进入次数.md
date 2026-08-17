# Spec：dims 页均停留与 screen_views 进入次数

| 项        | 内容                                                                      |
| --------- | ------------------------------------------------------------------------- |
| 应用      | `apps/nongyu-go-track-server`                                             |
| 需求类型  | **基建**（支撑管理端大屏）                                                |
| PRD       | `docs/forhuman/rawprds/nongyu-web-admin/数据大屏页面映射与停留时长PRD.md` |
| HTTP 契约 | 同步修订 `docs/nongyu-go-track-server/接口文档.md` §5.3                   |
| 下游      | Node BFF dims `metric` 枚举增加 `screen_dwell_avg`；Web Admin 大屏消费    |
| 状态      | **已实现**                                                                |

---

## 1. 背景

RN 对同一 pathname 上报 `screen_view` enter（无 `duration_ms`）与 leave（有 `duration_ms`）。现有 `screen_views` dim 对全部 `screen_view` 计数，进入次数被近似翻倍。页均停留尚无 dim metric。

---

## 2. 目标

1. `metric=screen_views`：按 `event_name` 计数 **进入** 事件。
2. 新增 `metric=screen_dwell_avg`：按 `event_name` 对 leave 的 `duration_ms` 求平均，写入/返回整数毫秒。
3. 今日 **LiveDims** 与历史日 **daily_dims**（日聚合 `RunAggregate`）口径一致。
4. 单测覆盖新口径与非法 metric。

---

## 3. 边界（非目标）

- 不改 ingest / 客户端字段。
- 不强制回填已写入的历史 `daily_dims.screen_views`；可选运维重跑 aggregate。
- 不改 overview 的 `screen_view_count`（仍可为当日全部 `screen_view` 条数）。
- 不做路由中文映射（展示层职责）。
- 不提高 `limit` 硬上限（保持默认 50、最大 100），由调用方传 100 取「全部」。

---

## 4. 详细需求

### 4.1 `screen_views`（进入次数）

**定义**：`event_type='screen_view' AND duration_ms IS NULL`，按 `event_name` `COUNT(*)`。

说明：与 RN「enter 无 duration、leave 有 duration」一致；不依赖解析 `props_json.phase`。

适用于：`LiveDims`、日聚合写入 `daily_dims`（`metric_key=screen_views`）。

### 4.2 `screen_dwell_avg`（页均停留）

**定义**：`event_type='screen_view' AND duration_ms IS NOT NULL`，按 `event_name` `AVG(duration_ms)`，结果 **四舍五入为 int64 毫秒**。

- `dim_key`：`name`
- `dim_value`：pathname（`event_name`）
- `metric_value`：平均停留 ms
- 排序：`metric_value DESC`，再 `dim_value ASC`，再截断 `limit`

LiveDims 允许该 metric；`RunAggregate` 对每个历史日 `ReplaceDims(..., "screen_dwell_avg", ...)`。

Admin `allowedDims`（或等价白名单）加入 `screen_dwell_avg`。

### 4.3 接口文档

`接口文档.md` §5.3 表更新：

| `metric`           | 今日 live / 历史聚合口径                                    |
| ------------------ | ----------------------------------------------------------- |
| `screen_views`     | `screen_view` 且 `duration_ms IS NULL`，按 name 计数        |
| `screen_dwell_avg` | `screen_view` 且 `duration_ms IS NOT NULL`，按 name 平均 ms |
| （其余不变）       |                                                             |

---

## 5. 业务流程

```text
日聚合 / LiveDims
  → screen_views: COUNT enter
  → screen_dwell_avg: AVG(duration_ms) leave → 整数 ms
  → 排序截断 → 返回 / 写入 daily_dims
```

---

## 6. 验收标准与测试

- [ ] 同名 1 次 enter + 1 次 leave：`screen_views` 该维 = 1，不是 2。
- [ ] 两次 leave `duration_ms` 1000 与 3000：`screen_dwell_avg` ≈ 2000。
- [ ] 仅 enter：出现在 `screen_views`，不出现在 `screen_dwell_avg`。
- [ ] `metric=screen_dwell_avg` 今日与历史日路径均可查；非法 metric 仍 400。
- [ ] `go test` 相关包通过。
