# Spec：Agent 设置（API Key 与 BaseURL）

| 项       | 内容                                                                                |
| -------- | ----------------------------------------------------------------------------------- |
| 应用     | `apps/nongyu-rn-app`                                                                |
| 需求类型 | **基建**                                                                            |
| PRD      | `docs/forhuman/rawprds/nongyu-rn-app/MyPage/设置页面PRD.md`（Api Key 和大模型配置） |
| 入口     | 「我的」→ 设置 →「农屿 Agent」→ `/mine/settings/agent`                              |
| 状态     | **已实现（待人工回归）**                                                            |

---

## 1. 背景

设置首页已有「农屿 Agent」灰显入口；AI 聊天页当前用 mock 模型。用户需要在本地配置 OpenAI 兼容的 `baseURL` 与 `API Key`，供 Agent 调用真实模型；凭据属敏感数据，登出须清空。

**Why**：选型与设置 PRD 要求「API Key 和大模型配置」；敏感凭据不得明文进 MMKV。  
**What**：Agent 设置子页（baseURL + API Key）+ SecureStore 持久化 + 登出清空 + AI 页按配置切换真实模型。

---

## 2. 目标

1. 「农屿 Agent」入口可进，打开子页 `/mine/settings/agent`。
2. 用户可选择主流服务商预设（DeepSeek / OpenAI / 通义 / Kimi / 智谱 / 硅基流动）自动填入 Base URL 与推荐模型名，或选「自定义」手填；再填写并保存 `API Key`；杀进程重开后仍可读。
3. 三项（baseURL / API Key / model）存 **SecureStore**；登出（主动登出 + Token 失效本地清会话）一并清空。
4. AI 聊天页：已配置则用真实 `OpenAIProvider`；未配置则提示去设置，不静默继续 mock。
5. 模型名随预设带出，允许在设置页微调；不另做独立「启用开关」UI。

---

## 3. 边界（非目标）

- Agent 总开关 UI
- 模型名选择器 / 多模型切换
- 云端同步凭据
- 密钥格式强校验（仅非空 + baseURL 基本形态）
- Declarative Generative UI、业务卡片（二课等）
- 语音转文字 / 长按录音输入（**本期不做**；后续考虑见 `Agent语音输入-后续考虑.md`）

---

## 4. Grill 共识

| 决策  | 结论                                                                      |
| ----- | ------------------------------------------------------------------------- |
| 归类  | 基建                                                                      |
| 字段  | baseURL + API Key + model（预设带出，可改）；启用开关仍不做               |
| 存储  | 均 SecureStore；登出清空                                                  |
| 交互  | 子页；显式「保存」按钮                                                    |
| AI 页 | 已配置 → 真实模型；未配置 → Toast / 空态提示去设置，不用 mock 顶替        |
| 登出  | `performJiaowuLogout` + `handleAuthInvalid` 本地清会话路径均清 Agent 配置 |

---

## 5. 详细需求

### 5.1 路由与入口

| 界面       | 路由                   | 说明                       |
| ---------- | ---------------------- | -------------------------- |
| 设置首页   | `/mine/settings`       | Agent 项 `available: true` |
| Agent 设置 | `/mine/settings/agent` | 本轮新增子页               |

### 5.2 子页 UI

1. **Base URL**：单行输入；占位如 `https://api.openai.com/v1`；说明「OpenAI 兼容接口根路径」。
2. **API Key**：单行明文输入（**不用** `secureTextEntry`，便于系统粘贴）；已保存时展示掩码或留空由用户重填（推荐：回显为空占位「已保存则留空表示不改」或加载后明文进输入框——本期采用**进入页时从 SecureStore 回填明文到输入框**，便于核对；失焦/离开不自动写盘）。落盘仍走 SecureStore。
3. **保存并检测**：先向所选模型发送「你好」做连通性探测；仅当返回合理 LLM 文本后才写入 SecureStore；失败 Toast 原因且不落盘。
4. **清除**（可选但推荐）：一键删本地配置并清空输入，Toast「已清除」。

### 5.3 持久化契约

SecureStore keys（仅字母数字与 `.` `-` `_`）：

| Key              | 值       |
| ---------------- | -------- |
| `agent_api_key`  | API Key  |
| `agent_base_url` | Base URL |

代码内默认模型名：`DEFAULT_AGENT_MODEL = "gpt-4o-mini"`（不写 SecureStore，本期）。

### 5.4 登出清空

以下路径必须调用 `clearAgentConfig()`（或等价）：

- `performJiaowuLogout`
- `handleAuthInvalid` 内的本地清会话

### 5.5 AI 页消费

- 进入 `/ai` 或发送消息前读取配置。
- 有完整配置 → `createAgent` 使用 `OpenAIProvider({ baseURL, apiKey, model: DEFAULT })`；配置变更后下次进入或下次发送应生效（不强制热重载正在进行的流）。
- 无配置 → 不发起模型请求；Toast「请先在设置中配置 Agent」并可引导 `/mine/settings/agent`。

---

## 6. 业务流程

```text
我的 → 设置 → 农屿 Agent → 填写 baseURL / API Key → 保存 → SecureStore
                                                      ↓
                                            AI 页读取 → OpenAIProvider
用户登出 / Token 失效本地清会话 → clearAgentConfig → SecureStore 删除两项
```

---

## 7. 验收标准

- [ ] 设置首页「农屿 Agent」可进，不再「即将开放」。
- [ ] 可保存 baseURL + API Key；杀进程重开后子页仍能读出。
- [ ] API Key 输入为明文（可粘贴）；持久化仍为 SecureStore。
- [ ] 主动登出后 SecureStore 中两项已删；再进设置页为空。
- [ ] Token 失效触发本地清会话后，Agent 配置同样清空。
- [ ] 已配置：AI 页能走真实流式（依赖用户填入的可用兼容服务）。
- [ ] 未配置：AI 页不静默用 mock，有明确提示去设置。
- [ ] 无新原生依赖；热更可发。

### 理想 UI

- 与课表设置子页同壳：`SettingsPageShell` + 分区标题 + 卡片表单，留白克制。
- 无仪表盘卡片墙；一项配置一块，保存主按钮用 brand 色。

---

## 8. 修订记录

| 日期       | 说明                                                           |
| ---------- | -------------------------------------------------------------- |
| 2026-08-15 | 初版：Grill 全推荐后落 Spec                                    |
| 2026-08-15 | 落地：SecureStore、设置子页、登出清空、AI 页按配置切换         |
| 2026-08-15 | 边界补充：语音输入本期不做，交叉引用后续考虑文档               |
| 2026-08-15 | API Key 输入去掉 secureTextEntry，便于粘贴；落盘仍 SecureStore |
