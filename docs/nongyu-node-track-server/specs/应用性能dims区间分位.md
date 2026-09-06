# Spec：Track · 应用性能 dims 区间分位

| 项       | 内容                                                                    |
| -------- | ----------------------------------------------------------------------- |
| 应用     | `apps/nongyu-node-track-server`                                         |
| 需求类型 | **业务**（支撑管理端大屏）                                              |
| PRD      | `docs/forhuman/rawprds/nongyu-web-admin/数据大屏应用性能区间查询PRD.md` |
| 配套     | Web Admin Spec `数据大屏-应用性能区间查询.md`；Node BFF Track 代理 Spec |
| 状态     | **已实现**                                                              |

---

## 1. 背景

`GET /v1/admin/metrics/dims` 仅支持单日 `date`。区间内 p50/p95 必须对原始 `events` 全样本重算，不能合并多天日聚合分位。原始事件约保留 30 天。

---

## 2. 目标

1. `perf_p50` / `perf_p95` 支持闭区间 `[from, to]`，对区间内 `event_type=perf` 且 `duration_ms` 非空样本按 `event_name` 重算分位。
2. 单日查询行为与现网兼容。
3. 非 perf 维度禁止跨日。

---

## 3. 边界

- 不改其它 metric 的跨日能力。
- 不延长 purge 窗口。
- 不同步 Go Track。
- 不改变现网默认过滤：无 `platform` / `name_prefix` 时 App dims 仍排除 `platform=web`。

---

## 4. 详细需求

### 4.1 `GET /v1/admin/metrics/dims` Query

| 参数          | 必填 | 说明                                                        |
| ------------- | ---- | ----------------------------------------------------------- |
| `metric`      | 是   | 既有枚举不变                                                |
| `date`        | 条件 | 单日模式：缺 `from`/`to` 时必填（或由调用方传）；与现网一致 |
| `from`        | 条件 | `YYYY-MM-DD`；与 `to` 成对出现                              |
| `to`          | 条件 | `YYYY-MM-DD`；与 `from` 成对出现                            |
| `limit`       | 否   | 默认 50，最大 100                                           |
| `platform`    | 否   | 既有                                                        |
| `name_prefix` | 否   | 既有                                                        |

**参数组合规则：**

1. **单日**：只传 `date`（推荐）；或 `from === to`（等价于该日）。
2. **区间**：传 `from` + `to`，且 `from < to`。此时 **忽略 `date`**（若同时传了）。
3. `from` / `to` 只传一个 → `400 BAD_REQUEST`。
4. `from > to` → `400`。
5. 区间跨度（含首尾）> **30** 天 → `400`（与原始保留对齐）。
6. `metric` 非 `perf_p50`/`perf_p95` 且 `from < to` → `400`（文案说明仅性能分位支持跨日）。
7. 日期格式非法 → `400`。

### 4.2 计算口径

- 数据源：`events`，`stat_date` 落在 `[from, to]`（闭区间），`event_type='perf'`，`duration_ms IS NOT NULL`。
- 分组：`event_name`。
- 分位：与现网 `percentile(sorted, 50|95)` 同一实现。
- 过滤：沿用现有 `DimFilter` / 默认排除 web（与 `liveDims` 单日路径一致）。
- 排序与截断：按 `metric_value` 降序，再 `dim_value` 升序，再 `limit`。

**禁止**：把多天 `daily_dims` 的 p50/p95 做平均、加权或取 max。

### 4.3 响应

成功 `data`：

```ts
{
  date?: string;   // 单日模式：该业务日；区间模式可省略或等于 to
  from: string;    // 实际查询起（单日时 = 该日）
  to: string;      // 实际查询止（单日时 = 该日）
  metric: string;
  items: Array<{
    dim_key: string;
    dim_value: string;
    metric_value: number;
  }>;
}
```

兼容：既有调用方若只读 `items`/`metric` 不受影响；新增 `from`/`to`。

### 4.4 单日路径

- `from === to` 或仅 `date`：可继续走现有 `liveDims` / `dims`（今日 live、历史读聚合或 live，规则不变）。
- 实现上允许统一走区间查询函数（`from=to`），但结果须与改前单日一致（同过滤、同分位算法）。

---

## 5. 验收与测试

| #   | 标准                                                                                    |
| --- | --------------------------------------------------------------------------------------- |
| 1   | 单日 `date` 行为与改前一致（回归）。                                                    |
| 2   | `from`/`to` 跨日：仅 perf 允许；其它 metric → 400。                                     |
| 3   | 跨度 >30 → 400；`from>to` → 400。                                                       |
| 4   | 单测：构造多日 perf 样本，断言区间 p50/p95 等于对合并数组直接算分位，不等于日分位均值。 |

单元测试为硬验收。
