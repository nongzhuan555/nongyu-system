# Spec：平台 LLM 代理失败埋点（Track 存储 + Node 上报）

| 项       | 内容                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------- |
| 需求类型 | **基建**                                                                                          |
| PRD      | `docs/forhuman/rawprds/nongyu-node-server/平台LLM代理失败埋点PRD.md`                              |
| 应用     | `apps/nongyu-go-track-server`、`apps/nongyu-node-server`                                          |
| 关联     | `docs/nongyu-go-track-server/接口文档.md`、`docs/nongyu-node-server/specs/平台LLM密钥池与代理.md` |
| 状态     | **已实现（待联调）**                                                                              |

---

## 1. 背景

平台 Key 池代理已上线；需观察真实失败分布。埋点数据必须落在 Go Track，禁止在 Node/MySQL 存埋点。

## 2. 目标

1. Node 在平台 LLM 代理返回约定业务错误时，**异步**向 Track 上报一条失败事件。
2. Track 接受服务端 Internal 写入，事件可幂等入库。
3. 上报失败仅打 Node 日志，**不得**改变 HTTP 状态码、业务错误码或响应体。

## 3. 边界（非目标）

- 成功调用埋点、自有 Key 直连失败埋点。
- 修改 DAU / `daily_metrics` 聚合口径。
- 在 MySQL 新增任何 analytics / llm_fail 表。

> 管理端列表：已在「LLM Key 池 → 失败记录」落地（见 §4.6）。

## 4. 详细需求

### 4.1 触发条件（Node）

在 `handleChatCompletions`（或等价出口）最终向客户端抛出 / 返回以下 `AppError.code` 之一时上报：

| code    | 含义           |
| ------- | -------------- |
| `50210` | 上游全部失败   |
| `50311` | 池繁忙排队超时 |
| `50310` | 池不可用       |
| `42910` | 用户日限       |
| `42911` | 用户并发忙     |

不覆盖：参数校验 `40001`、鉴权失败、客户端取消等非「平台模型调度」错误。

### 4.2 上报语义（Node）

- **异步 fire-and-forget**：在抛出/返回错误前 `void` 发起上报；超时建议 ≤2s；失败只 `warn` 日志。
- 使用已有 `TRACK_BASE_URL` + `INTERNAL_TOKEN`。
- `user_id` 取自当前 App 鉴权 `uid`；无 uid 则不上报。
- **禁止**把明文 API Key、完整 Authorization 写入 props。

### 4.3 Track：事件类型

扩展白名单：

| `event_type`     | 说明                            |
| ---------------- | ------------------------------- |
| `llm_proxy_fail` | 平台 LLM 代理失败（服务端写入） |

`event_name`：错误码十进制字符串，如 `"50210"`。

`platform`：可空（服务端事件建议空或不传）。

### 4.4 Track：内部写入接口

`POST /v1/internal/events`

**鉴权**：`X-Internal-Token`（与 Admin 相同）。

**Request（snake_case）**：

```json
{
  "user_id": 4,
  "student_no": "202399910",
  "events": [
    {
      "event_id": "uuid",
      "event_type": "llm_proxy_fail",
      "event_name": "50210",
      "client_ts_ms": 1786799000000,
      "props": {
        "error_code": 50210,
        "error_message": "平台模型调用失败…",
        "model": "glm-4.7-flash",
        "stream": true,
        "attempts": [
          {
            "attempt": 1,
            "key_id": 1,
            "key_name": "智谱key1",
            "account_group": "tanglei",
            "reason": "upstream 403: …"
          }
        ]
      }
    }
  ]
}
```

| 字段         | 约束                                           |
| ------------ | ---------------------------------------------- |
| `user_id`    | 必填，>0；写入 `events.user_id`                |
| `student_no` | 可选                                           |
| `events`     | 1～100，校验规则与 App ingest 相同（含新类型） |
| `props`      | ≤4KB，超限按现有截断策略                       |

**响应**：与 `POST /v1/track/events` 成功体同形（`accepted` / `duplicated` / `rejected` / `errors`）。

**副作用**：本期 **不** 因该事件更新 presence / 回写 Node 在线态（避免污染心跳）。

### 4.5 props 约定（Node 填充）

| 字段            | 何时                  | 说明                                            |
| --------------- | --------------------- | ----------------------------------------------- |
| `error_code`    | 总是                  | number                                          |
| `error_message` | 总是                  | 截断至 ≤512 字符                                |
| `model`         | 可知时                | 失败时租约/池解析后的上游 model（缺省为池默认） |
| `stream`        | 可知时                | boolean                                         |
| `attempts`      | 仅 `50210` 且有明细时 | 与代理调试明细同结构（无明文 Key）              |

### 4.6 文档同步

- 更新 `docs/nongyu-go-track-server/接口文档.md`：§2.7 类型 + §内部写入 + Admin 列表。
- Node 接口概览带过「失败异步上报 Track」与 Admin 查询代理。
- 管理端「LLM Key 池」页「失败记录」Tab 展示列表（日期区间 + 错误码筛选）。

## 5. 业务流程

```
App → Node LLM 代理 → 判定业务失败
                 ├─ 立即返回 AppError 给客户端
                 └─ 异步 POST Track /v1/internal/events → SQLite events
```

## 6. 验收

1. 触发 `50311`/`50210`/`42910` 等：Track DB 出现对应 `llm_proxy_fail`，`event_name` 为码字符串。
2. 关掉 Track：LLM 错误响应仍正常；Node 有 warn 日志。
3. MySQL 无新埋点表 / 无 fail 流水表。
4. Internal Token 错误时 Track 返回 403；Node 不上报成功也不影响用户响应。
5. 单测：Go 白名单 + internal ingest；Node 上报 helper 在失败路径被调用（可用 mock）。

## 7. 技术方案

本期简单，**不单独写 tech 文档**；契约以本 Spec + Track 接口文档为准。
