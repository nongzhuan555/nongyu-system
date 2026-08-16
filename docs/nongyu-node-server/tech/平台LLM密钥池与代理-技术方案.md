# 平台 LLM 密钥池与代理 - 技术方案

| 项        | 内容                                                                 |
| --------- | -------------------------------------------------------------------- |
| 版本      | v0.2（与实现对齐：Key 覆盖 model/baseUrl、全量启用入池、串行换 Key） |
| 日期      | 2026-08-15                                                           |
| 需求类型  | 基建                                                                 |
| 上游 Spec | `docs/nongyu-node-server/specs/平台LLM密钥池与代理.md`（真相源）     |
| 配套 Spec | Admin / RN 两份配套 Spec                                             |
| 上游 PRD  | `docs/forhuman/rawprds/nongyu-node-server/平台LLM密钥池与代理PRD.md` |
| 状态      | **已实现（调度行为已落文档）**                                       |

---

## 0. 阅读前提

- **WHAT / 边界 / 验收**：以 Spec 为准。
- **本文回答 HOW**：模块划分、加密、调度实现、SSE 代理、Admin/RN 接缝、落地步骤与风险。

---

## 1. 技术选型

| 领域      | 选型                                                                    | 理由                                                        |
| --------- | ----------------------------------------------------------------------- | ----------------------------------------------------------- |
| 后端模块  | `nongyu-node-server/src/modules/llm-pool/`                              | 与现有 `versions`/`posts` 同构：`repo` + `routes` + service |
| HTTP 上游 | Node 内置 `fetch`（Undici）                                             | 零新依赖；支持流式 `ReadableStream`                         |
| SSE 转发  | `Readable` pipe + 透传 `text/event-stream`                              | 不解析完整 JSON，降低延迟与内存                             |
| Key 加密  | AES-256-GCM；密钥由 `LLM_KEY_ENCRYPTION_SECRET` 经 SHA-256 派生 32 字节 | 标准 AEAD；密文格式 `v1:iv:tag:ciphertext`（base64）        |
| 调度状态  | 进程内单例 `KeyPoolScheduler`                                           | Spec 约定单实例；无 Redis                                   |
| 日用量    | MySQL `llm_user_usage_daily` + `INSERT ... ON DUPLICATE KEY UPDATE`     | 与现网 mysql2 一致；跨重启可计                              |
| 校验      | Zod                                                                     | 与现有 routes 一致                                          |
| 管理端    | 新页 `LlmKeysPage` + `adminApi` 方法                                    | 对齐 Users 页表格/抽屉模式                                  |
| RN        | 扩展 `getOrCreateNongyuAgent` 配置解析                                  | 不改 `nongyu-agent-sdk` 协议                                |

**不引入**：ioredis、bull、openai 官方 SDK、独立 LLM 微服务。

---

## 2. 总体架构

```text
RN OpenAIProvider
  Authorization: Bearer <AppJWT>
  POST {API_BASE}/api/app/llm/v1/chat/completions
                │
                ▼
     requireAppAuth → proxyChatCompletions
                │
                ├─ usageGate (日限 / 用户并发)
                ├─ scheduler.acquireLease (可排队)
                ├─ encrypt/decrypt Key
                └─ upstreamFetch(Zhipu) ──SSE/JSON──► client
                       └─ onFail → cooldown + retry other key

Admin JWT
  /api/admin/llm/keys CRUD ──► llm_api_keys 表
```

挂载（`app.ts`）：

- `app.use("/api/app/llm/v1", requireAppAuth, appLlmRouter)`
- `app.use("/api/admin/llm/keys", adminLlmKeysRouter)`

---

## 3. 数据库

新增 migration：`006_llm_pool.sql`（序号以仓库当时最大 +1 为准）。

内容对齐 Spec §5.2：

- `llm_api_keys`
- `llm_user_usage_daily`

同步更新 `docs/nongyu-node-server/数据库设计文档.md` 表清单（去掉「不建 Agent 相关」中与 Key 池冲突的表述：仍不建对话历史，但建 Key 池表）。

---

## 4. Node 模块设计

### 4.1 目录

```text
src/modules/llm-pool/
  crypto.ts          # encryptApiKey / decryptApiKey / suffixOf
  repo.ts            # keys + usage SQL
  mapper.ts          # row → admin DTO（脱敏）
  scheduler.ts       # 单例：候选、租约、冷却、排队、健康分
  proxy.ts           # 组装上游请求、流式/非流式、换 Key
  usage.ts           # 日限额与用户槽
  routes.app.ts      # POST /chat/completions
  routes.admin.ts    # CRUD
  config.ts          # 从 getEnv 读 LLM_* 配置
```

### 4.2 环境变量

在 `env.ts` 增加 Spec §5.1 字段；`LLM_KEY_ENCRYPTION_SECRET`：当 `LLM_POOL_ENABLED!==false` 时 `min(16)`（建议 32+）。  
`.env.example` 同步说明。

### 4.3 加密 HOW

```text
key = SHA-256(UTF8(LLM_KEY_ENCRYPTION_SECRET))  // 32 bytes
iv  = random 12 bytes
(ciphertext, tag) = AES-256-GCM(key, iv, plaintext)
store = "v1" || base64(iv) || base64(tag) || base64(ciphertext)  // 用 ':' 拼接
```

轮换应用密钥不在 MVP（丢 secret 则无法解密，需管理员重录 Key）。

### 4.4 调度 HOW

实现文件：`src/modules/llm-pool/scheduler.ts`（单例 `keyPoolScheduler`）+ `repo.listEnabledPoolKeys()`。

内存结构（与实现对齐）：

```ts
type RuntimeState = {
  inFlight: number;
  cooldownUntil: number; // epoch ms
  failStreak: number;
};

type PoolLease = {
  leaseId: string;
  keyId: number;
  keyName: string;
  accountGroup: string;
  userId: number;
  apiKeyPlain: string;
  baseUrl: string; // 已按 Key 覆盖规则解析
  model: string; // 已按 Key 覆盖规则解析
  acquiredAt: number;
};
```

**候选加载**：

1. `SELECT * FROM llm_api_keys WHERE status = 1`（不按 provider/model 过滤）。
2. 内存缓存 TTL ≈ 30s；Admin CRUD / `dropKey` / `invalidateCache` 后强制刷新。
3. `status=0` 或已 `dropKey` 的 id 不参与挑选。

**租约 endpoint 解析**（`materializeLease`）：

- `baseUrl = trim(row.base_url) || LLM_POOL_DEFAULT_BASE_URL`（去尾 `/`）
- `model = trim(row.model) || LLM_POOL_DEFAULT_MODEL`

**acquire**：

1. 池未启用 → `50310`。
2. 该 `userId` 已有租约 → `42911`（用户并发槽 = 1）。
3. 加载候选；空 → `50310`。
4. 按账号组容量 + 冷却 + 健康分选 Key；有则 `inFlight++`、登记 `userLease`、挂 `LEASE_MAX_MS` 定时器，返回租约。
5. 暂无空闲 → 进入 waiters；`QUEUE_WAIT_MS` 超时 → `50311`；他户 release 时 `wakeWaiters`。

**release**：清租约与用户槽、`inFlight--`；失败则抬 `failStreak` 并写 `cooldownUntil`；再 `wakeWaiters`。

**健康分（简单）**：倾向高 `weight`、低 `failStreak`、低 `inFlight`；同分 round-robin。

**账号组容量**：同组 enabled keys 的 `max_concurrent` 取 **min**（至少 1）。

### 4.5 代理 HOW（串行换 Key + 单路响应）

实现文件：`src/modules/llm-pool/proxy.ts` → `handleChatCompletions`。

1. 鉴权 / 日限额 / 校验 `messages`；**删除**客户端 `body.model`（上游 model 只来自租约）。
2. `maxAttempts = 1 + LLM_POOL_MAX_KEY_RETRIES`。
3. **串行循环**（非 `Promise.all` / 非扇出）：
   - `acquire` →（仅首次）日用量 +1 → `fetch(baseUrl + '/chat/completions', { Authorization: Bearer plainKey, body: { ...body, model: lease.model }, signal })`。
   - 上游非 2xx / 抛错 / 流式首包超时：记入 `attempts`、冷却释放、**continue** 下一把（此时尚未向客户端写成功 body）。
   - 非流式 2xx：`res.status(200).json(json)` → release 成功 → **return**（结束整次请求）。
   - 流式 2xx：写响应头并 `pipeline(upstream.body → res)` → 成功 release → **return**；若 pipe 中客户端断开：release 失败态并结束（`headersSent` 后不再换 Key）。
4. 循环耗尽 → `50210`，`message`/`data.attempts` 含每次 keyId/name/group/model/reason（无明文 Key）。
5. 客户端 `req` close：abort 当前上游 `AbortController`；不并行保留其它上游连接（本来就没有并行上游）。

**明确非目标（实现层）**：不会「同时调度多把 Key 等首包、再 abort 其余」；若产品要竞速扇出，需另开 Spec。

### 4.6 错误码

写入 `ErrorCodes`：

| 常量                   | 值    |
| ---------------------- | ----- |
| `LLM_USER_DAILY_LIMIT` | 42910 |
| `LLM_USER_BUSY`        | 42911 |
| `LLM_POOL_UNAVAILABLE` | 50310 |
| `LLM_POOL_BUSY`        | 50311 |
| `LLM_UPSTREAM_FAILED`  | 50210 |
| `LLM_KEY_NOT_FOUND`    | 40420 |

同步 `接口文档概览.md`。

### 4.7 Admin CRUD HOW

- 对齐 `versions` routes：Zod + `ok()` + `AppError`。
- List 合并 `scheduler.getRuntimeSnapshot(keyId)`。
- Create/Patch 明文只在内存短暂存在，入库前加密。
- Delete：DB 硬删 + `scheduler.dropKey(id)`（禁止新租约；已有租约结束即净）。

---

## 5. 管理端 HOW

| 项   | 方案                                                                           |
| ---- | ------------------------------------------------------------------------------ |
| 路由 | `ROUTES.llmKeys = "/llm-keys"`                                                 |
| 侧栏 | `AdminShell` SideMenu 增加一项（图标用现有 antd icon，如 `ApiOutlined`）       |
| API  | `adminApi.ts`：`listLlmKeys` / `createLlmKey` / `patchLlmKey` / `deleteLlmKey` |
| 页面 | `pages/LlmKeysPage.tsx`：Table + Modal/Drawer；风格跟 `UsersPage`              |
| 常量 | `AUTH_ERROR_CODES` 按需扩展展示文案                                            |

不做独立 design token；遵守 `design-system/web-admin/MASTER.md`。

---

## 6. RN HOW

### 6.1 配置解析

新增 `src/agent/resolveAgentProviderConfig.ts`（名可微调）：

```ts
type ProviderConfig = {
  baseURL: string;
  apiKey: string;
  model: string;
  source: "user" | "platform";
};

async function resolveAgentProviderConfig(): Promise<ProviderConfig | null>;
```

- 有 SecureStore 配置 → `source: "user"`。
- 否则读 `useSessionStore.getState().token`；有则  
  `baseURL = `${API_BASE_URL}/api/app/llm/v1``，`apiKey = token`，`model = PLATFORM_LLM_MODEL`（常量，默认与后端一致）。
- 否则 `null`。

`getOrCreateNongyuAgent` 改用该解析；`source` 变化时依赖现有 `invalidateNongyuAgent`。

**Token 刷新/顶号**：现有会话失效路径已 `clearSession` + logout 清理；确保其中调用 `invalidateNongyuAgent`（已有则不动）。

### 6.2 设置页

`AgentSettingsScreen` 顶部/表单下增加弱提示 Paragraph（1～2 行）。  
连通性检测：仅对**自有 Key**保存路径；平台模式不做本地 probe（避免无 Key 时误调）。

### 6.3 AI 空态

凡依赖 `hasAgentConfig` / `loadAgentConfig()` 判断「能否聊」的地方，改为「`resolveAgentProviderConfig() != null`」或等价：`hasUserConfig || hasAppToken`。  
需检索：`ai.tsx`、`ChatEmptyState`、`settings_get` 的 `agent.configured` 语义——**建议**：`configured` 仍表示「用户是否自配 Key」；另增「是否可对话」用解析函数，避免设置工具误报。

### 6.4 修订文档

实现时改 `Agent设置-APIKey与BaseURL.md` §2 目标第 4 条（Spec 已写明）。

---

## 7. 实现步骤（建议顺序）

1. **Migration + env + ErrorCodes + 接口文档**
2. **crypto + repo + admin CRUD**（无调度也可单测加解密与入库）
3. **scheduler + usage + app proxy**（用 mock 上游或真实智谱联调）
4. **单元测试**：组并发、冷却、排队超时、日限、用户忙
5. **Admin 页面**
6. **RN 回退 + 设置文案 + 空态**
7. **端到端联调**：录入 2 账号组 Key → RN 无 Key 对话 → 占满繁忙 → 自有 Key 直连

---

## 8. 测试要点

| 层   | 内容                                                                                        |
| ---- | ------------------------------------------------------------------------------------------- |
| 单测 | scheduler 组容量、冷却、waiter 超时；usage 日切（`BUSINESS_TZ`）                            |
| 集成 | Admin CRUD 脱敏；proxy 按 Key 解析 model/baseUrl；stream pipe（可用 http 本地 mock server） |
| 手工 | 智谱真实 Key；RN 真机/模拟器流式 + 工具调用一轮                                             |

---

## 9. 注意事项与风险

| 风险                               | 缓解                                   |
| ---------------------------------- | -------------------------------------- |
| 智谱按账号限流，3 Key 同组≠ 3 并发 | 调度按 accountGroup；运维用 3 组账号   |
| 流已开始无法无损换 Key             | 仅首包前重试；文档与日志标明           |
| 单实例内存态多副本部署错乱         | Spec/本文明示；扩容前上 Redis          |
| `LLM_KEY_ENCRYPTION_SECRET` 丢失   | 需重录 Key；备份 secret                |
| Agent 多 step 占租约久             | `LEASE_MAX_MS` + 用户并发 1            |
| 免费额度/政策变更                  | 管理端可禁用 Key；可改默认 model env   |
| JWT 当 apiKey 进 SDK               | 仅打自家代理；勿日志打印 Authorization |

**安全**：代理超时、body 大小沿用 `express.json` 限制；流式跳过二次 JSON parse；禁止把上游错误体中的 Key 回传。

---

## 10. 待你确认的 HOW 点（默认已按下表）

| #   | 点                                             | 默认 |
| --- | ---------------------------------------------- | ---- |
| T1  | 候选 Key 缓存 30s + Admin 写失效               | 采用 |
| T2  | 流式仅「未向客户端写字节前」换 Key；串行非扇出 | 采用 |
| T3  | RN `agent.configured` 仍=自有 Key；可对话另判  | 采用 |
| T4  | 不加 Redis / 不加探测按钮                      | 采用 |

确认本文后进入 **实施计划**（plans），再编码。
