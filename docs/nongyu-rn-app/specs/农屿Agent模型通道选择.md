# Spec：农屿 Agent 模型通道选择

| 项        | 内容                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------- |
| 应用      | `apps/nongyu-rn-app`                                                                                    |
| 需求类型  | **基建**                                                                                                |
| PRD       | `docs/forhuman/rawprds/nongyu-rn-app/Shell/农屿Agent模型通道选择PRD.md`                                 |
| 关联 Spec | `docs/nongyu-rn-app/specs/Agent设置-APIKey与BaseURL.md`（凭据与落盘仍有效；**通道解析规则以本文为准**） |
| 入口      | 「我的」→ 设置 →「农屿 Agent」→ `/mine/settings/agent`                                                  |
| 状态      | **已落地（待人工回归）**                                                                                |

---

## 1. 背景

用户可在本地配置 OpenAI 兼容的自有 Key；未配置时走农屿平台 LLM 代理。旧规则为「有完整自有配置则始终优先自有」，导致配置过 Key 后无法再选用农屿后台，除非清除凭据。

**Why**：已保存 Key 的用户仍希望能切换到免费/后台通道，且切回自有时无需重填。  
**What**：设备级「模型通道」偏好 + 设置页通道选择 UI + `resolveAgentProviderConfig` 按偏好解析（含回退）。

---

## 2. 目标

1. 设置页可显式选择：**农屿后台** / **自有 Key**；切到后台时不删除 SecureStore 凭据。
2. 解析结果与选择一致（在凭据/登录态允许的前提下）；边界见 §5.3。
3. 保存自有 Key 成功后自动将通道设为「自有 Key」，并 `invalidateNongyuAgent`。
4. 页面分区轻量整理：通道 → 上下文 →（平台说明）→ 自有 Key 表单；文案与同页上下文模式风格一致。

---

## 3. 边界（非目标）

- `apps/nongyu-web-admin` 同步改造
- 修改 `settings_get` / `settings_update` 工具契约（`agent.configured` 仍仅表示「是否已存完整自有凭据」）
- Agent 总开关、多 Key、云端同步通道偏好
- 改变平台代理模型名 / Base URL 约定（仍用现有 `PLATFORM_LLM_MODEL` 与 `/api/app/llm/v1`）
- 技术方案文档（本需求跳过 Tech）

---

## 4. Grill 共识

| 决策                 | 结论                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 归类                 | 基建                                                                                                                |
| 范围                 | 仅 RN App                                                                                                           |
| 交互                 | 顶部「模型通道」列表单选（与上下文模式同款）；保留 Key                                                              |
| 默认（无 MMKV 记录） | 有完整自有凭据 → `user`；否则 → `platform`                                                                          |
| 存储                 | MMKV `app:agent_provider_source`；登出 / 清 Key **不**清偏好                                                        |
| 选后台时表单         | 仍可见可编辑                                                                                                        |
| 保存 Key 成功        | 自动切到 `user` + invalidate Agent                                                                                  |
| 无完整凭据时         | 「自有 Key」选项**禁用**                                                                                            |
| 偏好 `user` 但无凭据 | 回退 `platform`（有 JWT）；无 JWT 则 `null`                                                                         |
| 清 Key               | 只清 SecureStore；偏好保留；UI 上若偏好仍为 `user` 且已无凭据，展示回退态（选中农屿后台或禁用自有项后视觉落在后台） |
| `settings_get`       | 本期不扩展通道字段                                                                                                  |
| Tech                 | 跳过                                                                                                                |

---

## 5. 详细需求

### 5.1 通道偏好类型与存储

```ts
type AgentProviderSourcePref = "platform" | "user";
```

| Key（MMKV）                 | 值                   | 说明                           |
| --------------------------- | -------------------- | ------------------------------ |
| `app:agent_provider_source` | `platform` \| `user` | 缺省键不存在时走 §5.2 默认推导 |

- Zustand store（建议 `agentProviderSourcePrefsStore`，或并入现有 Agent prefs 模块，但需独立 key）。
- 提供非 React 读取：`getAgentProviderSourcePref()`，供 `resolveAgentProviderConfig` 使用。
- `setProviderSource(value)`：写 MMKV + 更新 store + 调用方负责 `invalidateNongyuAgent`（设置页切换时立即 invalidate）。

### 5.2 默认推导（键不存在时）

1. `await loadAgentConfig()` 非空 → 有效偏好视为 `user`（**不强制回写** MMKV，保持惰性）。
2. 否则视为 `platform`。

用户首次显式点选后写入 MMKV。

### 5.3 解析规则（`resolveAgentProviderConfig`）

伪代码：

```text
pref = readPrefOrDefault()  // §5.2
userCfg = loadAgentConfig()
token = session JWT

if pref == "user" && userCfg:
  return { ...userCfg, source: "user" }

if pref == "user" && !userCfg:
  // 回退
  if token: return platformConfig(token)
  return null

if pref == "platform":
  if token: return platformConfig(token)
  return null
```

- `platformConfig`：与现网一致（`baseURL = ${API_BASE_URL}/api/app/llm/v1`，`apiKey = token`，`model = PLATFORM_LLM_MODEL`，`source: "platform"`）。
- **禁止**再出现「只要有 userCfg 就忽略偏好」的旧逻辑。
- `getOrCreateNongyuAgent` 仍按 `config.source === "user"` 决定是否注入 `web_search`（通道为平台时不注入）。

### 5.4 设置页 UI / 交互

**分区顺序（自上而下）：**

1. **模型通道**（新增）
2. **上下文管理**（现有）
3. **平台说明**（现有长文案卡片；可略收紧语气，说明「可选农屿后台或自有 Key，配置 Key 后仍可切回后台」）
4. **服务商 / Base URL / 模型名 / API Key / 保存·清除**（现有）

**模型通道选项：**

| id         | 标题     | 说明（hint）                                   |
| ---------- | -------- | ---------------------------------------------- |
| `platform` | 农屿后台 | 使用农屿平台调度池（可能排队）；无需自有 Key   |
| `user`     | 自有 Key | 直连你配置的兼容接口；可使用联网搜索等自有能力 |

交互：

- 列表单选 + radio，样式对齐「上下文管理」。
- 无完整自有凭据时：`user` 行禁用（不可点）；当前选中只能是 `platform`（若 store 仍为 `user`，UI 展示为选中 `platform` 或等价禁用态，**不强制改写** MMKV，解析已按 §5.3 回退）。
- 有完整凭据时：两项均可选；切换立即写偏好 + Toast + `invalidateNongyuAgent`。
- 页脚提示：「更改后立即生效；清除 API Key 不会重置通道偏好」。

**保存并检测成功：**

1. `saveAgentConfig`
2. `setProviderSource("user")`（若尚未为 `user`）
3. `invalidateNongyuAgent`
4. Toast 成功

**清除：**

1. `clearAgentConfig`（不清通道 MMKV）
2. 重置表单默认预设
3. `invalidateNongyuAgent`
4. Toast「已清除」；自有通道选项变为禁用；实际解析走 §5.3

登出：仍只 `clearAgentConfig`，**不**清通道偏好（与上下文模式一致）。

### 5.5 其它消费点

- `AgentSettingsNavCard`（平台繁忙引导配自有 Key）：文案可保持；用户配好后可通过通道切回后台——**不强制改卡片**。
- AI 聊天页：继续只依赖 `getOrCreateNongyuAgent` / `resolveAgentProviderConfig`，无额外入口要求。

---

## 6. 业务流程

```text
打开 Agent 设置
  → 读 MMKV 偏好（缺省则按是否有凭据推导展示）
  → 展示通道 / 上下文 / 说明 / 自有表单

点选「农屿后台」
  → 写 pref=platform → invalidate → 之后对话走平台（需 JWT）

点选「自有 Key」（仅当已有凭据）
  → 写 pref=user → invalidate → 之后对话走自有

保存并检测成功
  → 落盘凭据 → pref=user → invalidate

清除 Key
  → 删 SecureStore → invalidate；pref 保留；无凭据时 UI 禁用「自有 Key」

resolveAgentProviderConfig
  → 按 pref + 凭据 + JWT 返回 user | platform | null
```

---

## 7. 验收标准

- [ ] 已保存自有 Key 时，可切到「农屿后台」且 Key 仍在 SecureStore / 输入框仍在。
- [ ] 切到后台后发消息：`source` 为 platform（可用排队等平台行为验证）；再切回自有后恢复直连。
- [ ] 未配置 Key 时「自有 Key」不可选；仅农屿后台可选（登录态下）。
- [ ] 保存并检测成功后，通道自动为「自有 Key」。
- [ ] 清除 Key 后偏好可仍为 user，但解析回退平台；重新保存后可再选自有。
- [ ] 登出清空凭据，不清通道 MMKV；再登录后行为符合 §5.2 / §5.3。
- [ ] 自有通道下仍有 `web_search`；平台通道下无。
- [ ] `settings_get` 的 `agent.configured` 语义不变。
- [ ] 管理后台无改动。

### 理想 UI

- 通道区与上下文区同壳：分区标题 + surface 卡片 + radio 行 + 底部队提示。
- 整页顺序：通道 → 上下文 → 说明 → 自有配置；无新增仪表盘式卡片墙。

---

## 8. 修订记录

| 日期       | 说明                                                          |
| ---------- | ------------------------------------------------------------- |
| 2026-08-17 | 初版：Grill 全推荐后落 Spec                                   |
| 2026-08-17 | 落地：MMKV 通道偏好、resolve 按偏好、设置页通道单选与分区整理 |
