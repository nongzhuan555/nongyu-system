# Spec：平台 LLM 密钥池与代理

| 项        | 内容                                                                                          |
| --------- | --------------------------------------------------------------------------------------------- |
| 应用      | `apps/nongyu-node-server`（主契约 / 真相源）                                                  |
| 需求类型  | **基建**                                                                                      |
| PRD       | `docs/forhuman/rawprds/nongyu-node-server/平台LLM密钥池与代理PRD.md`                          |
| 配套 Spec | `docs/nongyu-web-admin/specs/LLM密钥池管理.md`、`docs/nongyu-rn-app/specs/平台LLM代理回退.md` |
| 状态      | **已实现（调度行为已落文档；含串行换 Key / 单路响应）**                                       |

---

## 1. 背景

RN Agent 现要求用户自配 OpenAI 兼容 `baseURL` + `apiKey`。平台希望在用户未配置时，用后台维护的智谱免费 Key 池转发调用；免费档易限流/排队，需调度轮换并对用户尽量无感。管理端需 CRUD 管理池内 Key。

**Why**：降低 Agent 使用门槛，同时保护平台 Key、吃满有限免费并发。  
**What**：OpenAI 兼容 LLM 代理 + Key 池调度 + 管理端管理 API + 用量约束。

---

## 2. 目标

1. 已登录 App 用户可调用平台代理 `POST .../chat/completions`（支持流式 SSE、tools/function calling），服务端从 Key 池选 Key 转发上游（OpenAI 兼容）。
2. Key 按 `accountGroup` 共享并发预算；租约占用、失败冷却、短排队、换 Key 重试，避免单 Key 长时间吊死。
3. 管理员可对 Key 增删改查、启停；密文存储，接口不回明文。
4. 单用户平台池并发 ≤1、日调用次数有上限；池满/超限有明确错误码与可读 message。
5. MVP 假设 Node **单实例**；进程内维护租约/冷却/排队。

---

## 3. 边界（非目标）

- 完整监控大盘、按 Prompt 内容审计存储。
- Redis / 多实例共享调度状态。
- 匿名或无 App JWT 使用平台池。
- 修改用户自有 Key 直连逻辑（仍由 RN 本地配置直连厂商）；本修订不改 App / Admin UI。
- 管理端「一键探测」可做，但非硬性验收项；MVP 可不做探测按钮。
- 不在本库存储 Agent 对话历史。
- 不按客户端请求体中的 `model` 选 Key 或改上游模型。

---

## 4. Grill 共识

| 决策       | 结论                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------- |
| 归类       | 基建                                                                                               |
| 触发       | 无自有 Key → 平台代理；有自有 Key → 直连（RN 侧）                                                  |
| 鉴权       | 代理须 App JWT；管理 CRUD 须已建档 Admin JWT                                                       |
| 限流模型   | 按 `accountGroup` 共享并发，默认每组 `maxConcurrent=1`                                             |
| 池满       | 短排队 ≤15s；超时失败                                                                              |
| 防刷       | 每用户平台槽并发 1；日调用上限默认 100（可配置）                                                   |
| 模型       | 全局默认 `LLM_POOL_DEFAULT_MODEL`（`glm-4.7-flash`）；**Key.model 非空则覆盖**；仍忽略客户端 model |
| Base URL   | 全局默认 `LLM_POOL_DEFAULT_BASE_URL`；**Key.baseUrl 非空则覆盖**                                   |
| 入池       | 凡 `status=1` 的已添加 Key 均可调度（不按 provider / model 过滤）                                  |
| 换 Key     | **串行**失败切换（非并行扇出）；单次 App 请求对客户端至多一路成功响应                              |
| 调度存储   | 单实例内存                                                                                         |
| Key 安全   | 加密存库；列表/详情仅脱敏；创建后不可再读明文；支持禁用与硬删                                      |
| 本修订范围 | 仅 Node Spec + 实现；不改 RN / Admin 前端；不另写技术方案                                          |

---

## 5. 详细需求

### 5.1 环境变量

| 变量                              | 必填 | 说明                                                              |
| --------------------------------- | ---- | ----------------------------------------------------------------- |
| `LLM_POOL_ENABLED`                | 否   | 默认 `true`；`false` 时代理接口直接 503                           |
| `LLM_POOL_DEFAULT_MODEL`          | 否   | 默认 `glm-4.7-flash`                                              |
| `LLM_POOL_DEFAULT_BASE_URL`       | 否   | 默认 `https://open.bigmodel.cn/api/paas/v4`                       |
| `LLM_POOL_QUEUE_WAIT_MS`          | 否   | 池满排队上限，默认 `15000`                                        |
| `LLM_POOL_FIRST_TOKEN_TIMEOUT_MS` | 否   | 首包超时换 Key，默认 `12000`                                      |
| `LLM_POOL_MAX_KEY_RETRIES`        | 否   | 换 Key 最大次数，默认 `2`（不含首次）                             |
| `LLM_POOL_USER_DAILY_LIMIT`       | 否   | 每用户每日 LLM 请求次数，默认 `100`                               |
| `LLM_KEY_ENCRYPTION_SECRET`       | 是*  | 用于加解密 Key；长度建议 ≥32；未配置则拒绝启动池相关写/读解密路径 |
| `LLM_POOL_LEASE_MAX_MS`           | 否   | 单次租约硬超时（防泄漏），默认 `300000`（5min）                   |

\* 开启池功能时必填。

### 5.2 数据模型

#### 表 `llm_api_keys`

| 列                          | 类型              | 说明                                                    |
| --------------------------- | ----------------- | ------------------------------------------------------- |
| `id`                        | BIGINT PK AI      |                                                         |
| `name`                      | VARCHAR(64)       | 展示名                                                  |
| `provider`                  | VARCHAR(32)       | 展示/归类用；默认 `zhipu`；**不作为入池过滤条件**       |
| `account_group`             | VARCHAR(64)       | 同账号归组；共享并发预算                                |
| `api_key_cipher`            | TEXT              | 加密后的 Key                                            |
| `api_key_suffix`            | CHAR(4)           | 明文末 4 位，列表展示                                   |
| `base_url`                  | VARCHAR(255)      | 可空；空则用全局默认；非空则该 Key 上游使用此地址       |
| `model`                     | VARCHAR(64)       | 可空；空则用全局默认；非空则该 Key 上游使用此模型       |
| `max_concurrent`            | INT               | 账号组预算取同组内 **min** 的正值；建议同组一致，默认 1 |
| `weight`                    | INT               | 调度权重，默认 1，≥1                                    |
| `status`                    | TINYINT           | `1` enabled / `0` disabled                              |
| `success_count`             | BIGINT            | 累计成功次数（转发完成）                                |
| `fail_count`                | BIGINT            | 累计失败次数                                            |
| `last_used_at`              | DATETIME(3) NULL  |                                                         |
| `last_error`                | VARCHAR(255) NULL | 最近错误摘要（不含 Key）                                |
| `created_at` / `updated_at` | DATETIME(3)       | UTC                                                     |

索引：`(provider, status)`、`(account_group, status)`。

#### 表 `llm_user_usage_daily`

| 列              | 类型         | 说明                           |
| --------------- | ------------ | ------------------------------ |
| `id`            | BIGINT PK AI |                                |
| `user_id`       | BIGINT       | `users.id`                     |
| `usage_date`    | DATE         | 业务日（`BUSINESS_TZ` 日历日） |
| `request_count` | INT          | 当日已计次的代理请求数         |
| `updated_at`    | DATETIME(3)  |                                |

唯一键：`(user_id, usage_date)`。

> 冷却截止时间、inFlight、排队为**内存态**，不落库。

### 5.3 调度规则（WHAT）

1. **候选集**：凡已添加且 `status=1` 的 Key 均可调度（**不**按 `provider` / `model` 过滤）；`status=0` 不调度。候选列表有短缓存（实现约 30s），Admin 写 Key 后须失效缓存。
2. **上游解析（按租约 Key）**：
   - `baseUrl` = `trim(Key.base_url)` 非空 ? 去尾 `/` 后的值 : `LLM_POOL_DEFAULT_BASE_URL`
   - `model` = `trim(Key.model)` 非空 ? 该值 : `LLM_POOL_DEFAULT_MODEL`
   - 非默认厂商须在 Key 上填对 `base_url`（及通常 `model`），否则会落到全局智谱默认地址。
3. **账号组预算**：组内 `capacity = min(同组 enabled keys 的 max_concurrent)`（至少为 1）；组内当前租约数 ≥ capacity 则该组不可再分配。
4. **选 Key**：在有空闲预算的组中，优先不在冷却、`inFlight` 较低、健康分较高、`weight` 较大的 Key；同分 round-robin。
5. **租约**：分配后占用至流结束 / 非流式响应结束 / 客户端中断 / `LLM_POOL_LEASE_MAX_MS` / 失败释放；租约携带解析后的 `baseUrl` / `model`。
6. **排队**：无可用 Key 时等待至多 `LLM_POOL_QUEUE_WAIT_MS`；超时返回平台繁忙错误。
7. **失败切换（串行）**：
   - 同一 `POST .../chat/completions` 请求内，对上游的尝试是 **串行** 的：一把 Key 失败并释放租约后，才申请下一把。
   - **禁止**对多把 Key 并行扇出 / 竞速；不存在「多路上游同时向同一客户端写 body」的路径。
   - 触发换 Key：上游非 2xx、连接失败、流式首包超时（且尚未向客户端写出响应头/字节）。
   - 失败 Key 进入冷却（指数退避，上限建议 5min）；换 Key 次数受 `LLM_POOL_MAX_KEY_RETRIES` 限制（不含首次）；允许落到不同 model/baseUrl；耗尽则 `50210`。
8. **对客户端响应唯一性**（单次代理请求）：
   - 非流式：仅在某一把 Key 成功拿到 JSON 后写一次 `200` + body，然后结束；失败换 Key 发生在尚未写响应时。
   - 流式：仅在某一把 Key 上游 2xx 后开始向客户端写 SSE；一旦 `headersSent` / 已开始 pipe，**不再**换 Key 重试（避免双份流）；客户端断开则 abort 当前上游并释放租约。
   - 因此：单次平台代理 HTTP 请求 → 客户端至多收到 **一路** 成功模型输出。若 UI 出现「同一问题多份回复」，应排查 App 重复发请求 / Agent 多轮再调，而非池内并行。
9. **用户约束**：同一 `userId` 同时仅 1 个平台租约；日请求数达上限则拒绝新请求（进行中的不强制杀）。
10. **计次**：每次进入代理处理（首次拿到租约后）计 1 次日用量；同请求内串行换 Key **不**重复计次。

### 5.4 App 代理接口

#### `POST /api/app/llm/v1/chat/completions`

- 鉴权：`requireAppAuth`
- 行为：OpenAI Chat Completions 兼容；支持 `stream: true`（SSE）与 `stream: false`；透传 `messages` / `tools` / `tool_choice` / `temperature` / `max_tokens` 等常用字段。
- **上游 model**：取自当前租约 Key 的解析结果（见 §5.3.2）；**忽略**客户端传入的 `model`（不得用其选 Key 或覆盖上游）。
- **禁止**：把平台 Key 回写到任何响应头/体。
- 成功：透传上游 JSON 或 SSE（`text/event-stream`）。
- Authorization：客户端使用 `Bearer <AppJWT>`（RN 侧把 JWT 填进 OpenAIProvider 的 apiKey 位即可）。

#### 错误（业务 envelope 或 HTTP，与现有 App 风格对齐；流式若已开始则按 SSE/连接中断约定，见技术方案）

| 场景                     | HTTP | code（建议）                 | message（对用户）                                                                             |
| ------------------------ | ---- | ---------------------------- | --------------------------------------------------------------------------------------------- |
| 未登录                   | 401  | 现有 UNAUTHORIZED            | 现有文案                                                                                      |
| 池关闭 / 无可用 Key 配置 | 503  | `50310` LLM_POOL_UNAVAILABLE | 平台模型暂不可用                                                                              |
| 日限额                   | 429  | `42910` LLM_USER_DAILY_LIMIT | 今日平台模型次数已用完，请配置自有 Key 或明日再试                                             |
| 用户并发占用中           | 429  | `42911` LLM_USER_BUSY        | 请等待当前回复完成后再试                                                                      |
| 池满排队超时             | 503  | `50311` LLM_POOL_BUSY        | 平台模型繁忙，请稍后重试或配置自有 Key                                                        |
| 上游全部失败             | 502  | `50210` LLM_UPSTREAM_FAILED  | `message` 含每次尝试明细（keyId/name/group + 上游原因）；`data.attempts` 同结构；不含明文 Key |

须将新错误码写入 `ErrorCodes`，并同步 `docs/nongyu-node-server/接口文档概览.md`。

### 5.5 Admin Key 池接口

均需 `requireProvisionedAdminAuth`。响应 camelCase + `{ code, message, data }`。

#### `GET /api/admin/llm/keys`

Query：`page`（默认 1）、`pageSize`（默认 20，上限 100），`status`（可选 0/1），`accountGroup`（可选模糊/精确，实现选精确）。

`data`：分页 `{ list, total, page, pageSize }`（与其它 Admin 列表一致）；item 含 id、name、provider、accountGroup、apiKeySuffix、baseUrl、model、maxConcurrent、weight、status、successCount、failCount、lastUsedAt、lastError、createdAt、updatedAt；**另附内存态**（若可取）：`inFlight`、`cooling`、`cooldownUntil`（ISO 或 null）。

#### `POST /api/admin/llm/keys`

Body：`name`、`accountGroup`、`apiKey`（明文，仅此一次）、可选 `baseUrl`、`model`、`maxConcurrent`、`weight`、`status`（默认 1）、`provider`（默认 `zhipu`）。

校验：`apiKey` 非空；`accountGroup` 非空；`maxConcurrent`≥1；`weight`≥1。

成功：返回创建后的脱敏对象（同 list item）。

#### `PATCH /api/admin/llm/keys/:id`

可改：`name`、`accountGroup`、`baseUrl`、`model`、`maxConcurrent`、`weight`、`status`。  
可选 `apiKey`：若提供非空则轮换密文并更新 suffix；不提供则不改 Key。

#### `DELETE /api/admin/llm/keys/:id`

硬删；若内存仍有租约，标记不可再选并在租约结束后自然消失即可（实现细节见技术方案）。

### 5.6 加密

- 使用 `LLM_KEY_ENCRYPTION_SECRET` 对称加密（算法在技术方案中选定，如 AES-256-GCM）。
- 禁止日志打印明文 Key。

### 5.7 可观测性（MVP）

- 结构化日志：userId、keyId、accountGroup、latency、结果（成功/429/换 Key/排队超时）；不含 prompt 全文与 Key。
- Admin list 暴露的计数/冷却足以运维 MVP。

---

## 6. 业务流程

### 6.1 App 代理

```text
AppJWT 校验
 → 日限额检查
 → 用户并发槽检查
 → 申请租约（可排队 ≤15s）
 → 计日用量 +1
 → 选 Key（启用 Key 全可调度）并按 Key 解析 baseUrl/model
 → **串行**转发上游；失败则冷却并换下一把（有限次，可跨不同 model；未向客户端写成功响应前）
 → 成功则向客户端写唯一一路响应并结束；结束释放租约与用户槽
```

### 6.2 管理端

管理员登录 → Key 池页 → 列表 / 新建 / 编辑启停 / 删除。

---

## 7. 验收标准与测试方案

### 7.1 后端单元 / 集成（优先）

1. 调度：同 `accountGroup` 两 Key 时并发占用不超过组预算 1。
2. 冷却：模拟 429 后该 Key 一段时间内不被选中，请求落到其他组。
3. 排队：占满后新请求在 wait 内获得租约或超时返回 `50311`。
4. 日限额：第 101 次返回 `42910`（默认 limit=100）。
5. 用户并发：同用户第二路同时请求返回 `42911`。
6. Admin CRUD：创建后 GET 无明文；PATCH 轮换 Key 后 suffix 更新；DELETE 后不可再被调度。
7. 代理：非流式与流式（至少 mock 上游）可走通；Key.model 为空时上游为全局默认；Key.model 非空时上游为该值；客户端 model 被忽略。
8. 入池：`status=1` 且 `model`/`provider` 与默认不同的 Key 仍可被调度；`status=0` 不可调度。

### 7.2 人工联调

1. 管理端录入 2+ 个不同 `accountGroup` 的 Key。
2. RN 清空自有 Key，登录后 Agent 可对话（默认 Key 走 `glm-4.7-flash`）。
3. 管理端为某 Key 填写非默认 `model`（及必要时 `baseUrl`），该 Key 被选中时上游应使用所填值。
4. 人为占满槽后，新对话在约 15s 内失败并看到繁忙文案。
5. 自有 Key 配置后仍直连，不打平台代理。

---

## 8. 对既有 Spec 的影响

- `docs/nongyu-rn-app/specs/Agent设置-APIKey与BaseURL.md` 中「未配置则提示去设置、不用 mock」修订为：未配置自有 Key 时优先走平台代理（详见 RN 配套 Spec）；无 JWT 或池不可用时再提示配置/登录。
