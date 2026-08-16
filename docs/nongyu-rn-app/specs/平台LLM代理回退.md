# Spec：平台 LLM 代理回退（RN）

| 项        | 内容                                                                 |
| --------- | -------------------------------------------------------------------- |
| 应用      | `apps/nongyu-rn-app`                                                 |
| 需求类型  | **基建**                                                             |
| PRD       | `docs/forhuman/rawprds/nongyu-node-server/平台LLM密钥池与代理PRD.md` |
| 后端契约  | `docs/nongyu-node-server/specs/平台LLM密钥池与代理.md` §5.4          |
| 关联 Spec | `docs/nongyu-rn-app/specs/Agent设置-APIKey与BaseURL.md`（行为修订）  |
| 状态      | **已实现（待人工联调）**                                             |

---

## 1. 背景

用户未配置自有大模型 Key 时，原先只能提示去设置。现平台提供 LLM 代理与 Key 池，RN 需在无自有 Key 时自动走农屿后端代理，尽量无感；已配置自有 Key 时行为不变。

---

## 2. 目标

1. `loadAgentConfig()` 有完整自有配置 → 仍直连厂商（现状）。
2. 无自有配置，但会话中有有效 App JWT → 使用平台代理创建 `OpenAIProvider`（`baseURL` 指向 Node 代理前缀，`apiKey` 使用 App JWT，`model` 使用平台约定模型名）。
3. 无自有配置且无 App JWT → 不可创建 Agent；提示登录农屿或配置自有 Key（不静默 mock）。
4. Agent 设置页增加弱提示：未配置时将使用平台免费模型（须登录）。
5. 平台代理业务错误（`50210`/`50311`/`50310`/`42910`/`42911`）时 RN 展示固定友好回复 + A2UI 跳转设置；管理端可查 Track `llm_proxy_fail` 列表。

---

## 3. 边界（非目标）

- 在 RN 展示 Key 池状态、排队位置、剩余日次数（MVP 可不做次数 UI）。
- 修改 Agent 工具集、会话存储、流式 UI。
- 管理端功能。

---

## 4. Grill 共识（RN 相关）

| 决策   | 结论                               |
| ------ | ---------------------------------- |
| 优先级 | 自有 Key 永远优先                  |
| 无感   | 无自有 Key + 有 JWT → 静默走平台池 |
| 提示   | 设置页弱文案即可；不强制弹窗       |
| 未登录 | 不开放平台池                       |

---

## 5. 详细需求

### 5.1 配置解析

扩展 Agent 创建逻辑（`getOrCreateNongyuAgent` 或等价层）：

| 条件                               | 行为                                                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| SecureStore 有 baseURL+apiKey      | `OpenAIProvider({ baseURL, apiKey, model })` 直连                                                     |
| 无自有配置 && `session.token` 存在 | `OpenAIProvider({ baseURL: API_BASE_URL + '/api/app/llm/v1', apiKey: token, model: PLATFORM_MODEL })` |
| 否则                               | 返回 `null`，沿用空态/引导                                                                            |

- `PLATFORM_MODEL`：与后端默认一致的常量（如 `glm-4.7-flash`）；允许后续改为远端下发，MVP 可本地常量。
- 代理 path 须使 SDK 请求落在 `.../v1/chat/completions` → 即 baseURL 以 `/api/app/llm/v1` 为末级（与 OpenAIProvider 拼接 `/chat/completions` 对齐）。

### 5.2 设置页

- 保留现有自有 Key 配置与连通性检测。
- 增加简短说明文案（弱提示，非警告色大横幅）：未填写 API Key 时，登录状态下将使用平台免费模型；也可自行配置更稳的服务商。
- 不要求用户为「使用平台模型」单独保存空配置。

### 5.3 AI 页 / 空态

- 有平台回退能力时，不再仅因「未配置 Agent」而阻断（在已登录前提下）。
- 未登录且未配置：引导登录或去设置。
- 文案避免承诺「永久免费 / 无限速」；一般失败时展示服务端 message；`50311` 见 §5.5。

### 5.4 登出与失效

- 登出仍清空自有 Agent 配置（现状）。
- Token 失效后平台回退不可用；下次需重新登录或自有 Key。
- `invalidateNongyuAgent` 在 Token 变更/登出时仍须调用，避免沿用旧 JWT 的 Provider 单例。

### 5.5 平台代理失败用户提示

当平台代理返回以下业务错误码之一时：`50210` / `50311` / `50310` / `42910` / `42911`：

1. **不**以红色错误行 / 失败 Toast 展示原始后端报文。
2. Assistant 消息正文固定为：  
   「农屿后台使用的是智谱的免费模型，排队时间较长且服务不稳定，若您追求快速响应和稳定功能，请自行配置大模型的API Key」
3. 同条消息通过 A2UI（伪 toolCall `platform_llm_busy_nav`）挂载入口卡片，点击跳转 `/mine/settings/agent`。
4. 该伪 toolCall 仅用于 UI，不得进入后续模型上下文。

其他错误（鉴权/参数等）仍走原有错误路径。

### 5.6 修订既有 Spec

`Agent设置-APIKey与BaseURL.md` §2 目标第 4 条由：

> 未配置则提示去设置，不静默继续 mock

修订为：

> 已配置自有 Key → 直连；未配置但有 App JWT → 平台代理；否则提示登录或去设置；禁止 mock 顶替。

（实现本 Spec 时同步改该文档状态说明一行即可。）

---

## 6. 验收

1. 登录 + 清空自有 Key：可正常发起 Agent 对话（后端 Key 池已配置时）。
2. 配置自有 Key 后：请求打向用户 baseURL，不经过 `/api/app/llm/`。
3. 未登录 + 无自有 Key：无法生成，有登录或去设置引导。
4. 模拟后端 `50311`/`50210`/`42910` 等平台代理业务失败：对话中出现固定文案 +「配置自有 API Key」卡片，可跳转 Agent 设置；无失败 Toast。
5. 设置页可见弱提示文案。
