# 实施计划：平台 LLM 密钥池与代理

| 项       | 内容                                                           |
| -------- | -------------------------------------------------------------- |
| Spec     | `docs/nongyu-node-server/specs/平台LLM密钥池与代理.md`（主）   |
| 配套     | Admin / RN 两份 Spec                                           |
| 技术方案 | `docs/nongyu-node-server/tech/平台LLM密钥池与代理-技术方案.md` |
| 应用     | `nongyu-node-server` → `nongyu-web-admin` → `nongyu-rn-app`    |
| 状态     | **已实现（待人工联调）**                                       |

---

## 1. 实施计划

一人分阶段交付；**后端可测通后再做 Admin/RN**，避免前端空等。编码时按域调用对应 subagent/Skill（Node：`nodejs-backend-patterns`；Admin：web-admin 设计准则；RN：既有 Agent 配置模式）。

| 阶段 | 内容                                        | 风险 / 缓解                             |
| ---- | ------------------------------------------- | --------------------------------------- |
| A    | Migration + env + ErrorCodes + 接口文档骨架 | 低；secret 未配时池功能拒写并有明确错误 |
| B    | crypto + repo + Admin CRUD API              | 单测加解密与脱敏                        |
| C    | scheduler + usage + App 代理（流式/非流式） | 首包前换 Key；mock 上游测 pipe          |
| D    | Admin 页面 `/llm-keys`                      | 对齐 Users 交互                         |
| E    | RN 平台回退 + 设置弱提示 + 空态可聊判断     | 勿把 `configured` 与「可聊」混为一谈    |
| F    | 联调 + 修订 Agent 设置 Spec 文案 + 文档状态 | 真实智谱 Key                            |

**改动面**：

- `apps/nongyu-node-server/**`（主）
- `apps/nongyu-web-admin/**`
- `apps/nongyu-rn-app/**`（agent 配置解析 / 设置页 / AI 入口判断）
- `docs/nongyu-node-server/**`（库表文档、接口概览、本计划/Spec/tech 状态）
- `docs/nongyu-rn-app/specs/Agent设置-APIKey与BaseURL.md`（目标第 4 条）

**不写（MVP）**：Redis、多厂商、用量大盘、探测按钮、对话审计落库。

---

## 2. 实施步骤

### 2.1 阶段 A — 基建落库

1. `migrations/006_llm_pool.sql`（或下一序号）：`llm_api_keys`、`llm_user_usage_daily`。
2. `env.ts` + `.env.example`：Spec §5.1 全部变量；`LLM_POOL_ENABLED` 默认 true；开启时校验 `LLM_KEY_ENCRYPTION_SECRET`。
3. `ErrorCodes`：42910 / 42911 / 50310 / 50311 / 50210 / 40420。
4. `接口文档概览.md` 增补 App 代理与 Admin CRUD 条目（可先骨架后随实现补全字段）。
5. `数据库设计文档.md` 增加两表说明。

### 2.2 阶段 B — Key CRUD

```text
src/modules/llm-pool/
  crypto.ts / repo.ts / mapper.ts / routes.admin.ts / config.ts
```

1. AES-256-GCM 加解密（tech §4.3）。
2. Admin：`GET/POST/PATCH/DELETE /api/admin/llm/keys`。
3. `app.ts` 挂载 admin 路由。
4. 单测或脚本：encrypt → decrypt roundtrip；list 无明文。

### 2.3 阶段 C — 调度与代理

1. `scheduler.ts`：租约、账号组容量、冷却、排队、缓存失效。
2. `usage.ts`：用户并发槽 + 日限额（`BUSINESS_TZ` 日切）。
3. `proxy.ts` + `routes.app.ts`：`POST /chat/completions`。
4. `app.ts`：`/api/app/llm/v1` + `requireAppAuth`。
5. 测试：组并发、冷却换 Key、排队超时、日限、用户忙、强制 model；流式用本地 mock HTTP。

### 2.4 阶段 D — 管理端 UI

1. `ROUTES.llmKeys`、`SideMenu`、`AppRouter`。
2. `adminApi` 四个方法 + 错误码常量（如需）。
3. `LlmKeysPage`：列表 / 新建 / 编辑 / 启停 / 删除确认。
4. 目视：响应体无完整 Key。

### 2.5 阶段 E — RN

1. `resolveAgentProviderConfig`（或等价）。
2. `getOrCreateNongyuAgent` 接入。
3. 检索并修正「能否发消息」判断（`ai.tsx` / `ChatEmptyState` 等）。
4. `AgentSettingsScreen` 弱提示；`settings_get.agent.configured` 保持「自有 Key」。
5. Token 变更 / 登出路径确认 `invalidateNongyuAgent`。

### 2.6 阶段 F — 收尾

1. 真实 Key 联调（≥2 个 `accountGroup`）。
2. 修订 `Agent设置-APIKey与BaseURL.md`。
3. Spec / tech / plan 状态改为已实现或待人工回归。
4. 按仓库规范跑相关 lint / typecheck（若有现成 script）。

---

## 3. 验收对照（摘自 Spec）

- [ ] Admin 可 CRUD；永不回明文
- [ ] 同 accountGroup 并发不超过组预算
- [ ] RN 无自有 Key + 登录可聊；有自有 Key 不打代理
- [ ] 池满约 15s 内失败文案；日限 / 用户忙错误码正确
- [ ] 流式 + 至少一轮 tools 可用（联调）

---

## 4. 注意事项

- 日志禁止打印 Key / 完整 Authorization / 大段 prompt。
- Admin 写操作后 `scheduler.invalidateCache()`。
- 流式已向客户端写字节后禁止换 Key。
- 本地开发需配置 `LLM_KEY_ENCRYPTION_SECRET` 与至少 1 条 Key，否则平台回退 503。

---

确认本计划后开始编码（建议严格按 A→F）。
