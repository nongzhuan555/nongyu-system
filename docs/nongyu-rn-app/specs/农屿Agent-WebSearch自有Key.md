# Spec：农屿 Agent WebSearch 工具（自有 Key 限定）

| 项       | 内容                                                                      |
| -------- | ------------------------------------------------------------------------- |
| 应用     | `apps/nongyu-rn-app`（挂载）；`packages/nongyu-agent-sdk`（导出工具）     |
| 需求类型 | **基建**                                                                  |
| 复用     | SDK `BuiltinTools/WebSearchTool`（`web_search`，Bing CN 主源 + 搜狗备源） |
| 入口     | 农屿 AI 对话（`getOrCreateNongyuAgent`）                                  |
| 状态     | **已确认并落地（待人工回归）**（2026-08-15）                              |
| 技术方案 | 本期跳过                                                                  |

---

## 1. 背景

**Why**：自有 Key 用户需要外网实时资讯检索能力；平台代理路径不宜开放无计费上网搜索，避免滥用与成本风险。  
**What**：复用 SDK 已有 `web_search`，仅在用户配置自有 API Key 时注入到农屿 Agent。

---

## 2. 目标

| #   | 目标                                             | 验收                                         |
| --- | ------------------------------------------------ | -------------------------------------------- |
| G1  | SDK 主入口可导出 `webSearchTool`                 | RN 可从 `nongyu-agent-sdk` 直接 import       |
| G2  | 仅 `source === "user"` 时注入 `web_search`       | 平台代理 / 无配置 Agent 工具表中不存在该工具 |
| G3  | 自有 Key 时 systemPrompt 说明何时用 `web_search` | 校内专用工具优先；外网资讯才搜索             |
| G4  | 搜索无需用户审批；无 Generative UI 卡片          | 不弹确认框；结果回灌模型后口头总结           |

---

## 3. 边界（非目标）

- 不接 Tavily / Serper / Google 等第三方 Search API
- 不做平台代理路径的 WebSearch（含 Node 侧代搜）
- 不做搜索结果 Generative UI 卡片
- 不改 `web_nav_*`（常用网站白名单）行为与优先级语义以外的实现
- 不引入 `web_fetch`（本期仅 search）
- 独立 tech / 实施计划文档

---

## 4. Grill 共识

| 决策     | 结论                                             |
| -------- | ------------------------------------------------ |
| 归类     | 基建                                             |
| 实现     | 复用 SDK `webSearchTool`（Bing CN → 搜狗降级）   |
| 注入条件 | `resolveAgentProviderConfig().source === "user"` |
| 审批     | 不需要                                           |
| 展示     | 本轮无卡片                                       |
| Prompt   | 自有 Key 分支补充；校内工具优先                  |
| 文档     | 短 Spec；跳过 tech                               |

---

## 5. 详细需求

### 5.1 SDK 导出

- 在 `packages/nongyu-agent-sdk/src/index.ts` 导出 `webSearchTool`（来自 `./core/tool/BuiltinTools`）。
- 不改工具本身的 name / schema / DDG 实现（除非导出路径需要的再导出）。

### 5.2 RN 注入

在 `getOrCreateNongyuAgent`：

```text
baseTools = { second, jiaowu, course*, settings, webNav, plaza }
if config.source === "user":
  tools = { ...baseTools, web_search: webSearchTool }
else:
  tools = baseTools
```

- `sourceKey` 已含 `config.source`，切换自有 Key ↔ 平台代理会重建 Agent，工具集随之正确切换。

### 5.3 systemPrompt

- **仅自有 Key 分支**追加说明：可用 `web_search` 检索互联网；教务 / 二课 / 课表 / 广场 / 设置 / 常用网站等意图**必须优先**对应专用工具，禁止用网页搜索代替。
- 平台代理分支保持现有 prompt（不含 `web_search` 指引），避免模型幻想可用该工具。

### 5.4 审批与 UI

- `web_search` 保持 SDK 默认 `needsApproval: false`。
- 不注册 render 组件。

### 5.5 搜索源（稳定性）

- **主源**：`cn.bing.com` HTML 抓取解析。
- **备源**：主源失败或 0 条结果时，改用 `www.sogou.com` HTML。
- 双源皆失败时返回结构化空结果（含 `error` 文案），不裸抛导致对话中断。
- 不依赖 DuckDuckGo（国内网络常超时不可达）。

---

## 6. 业务流程

```
resolveAgentProviderConfig()
  → source=user  → createAgent(tools 含 web_search + 含搜索指引的 prompt)
  → source=platform → createAgent(tools 不含 web_search + 原 prompt)
  → null → 不创建 Agent
```

---

## 7. 验收

1. 设置中配置自有 Key 后进 AI：问「今天有什么科技新闻」等，模型可调用 `web_search`，且无确认弹窗。
2. 清除自有 Key、仅登录走平台模型：同一类问题不应出现 `web_search` 工具调用（工具未注册）。
3. 自有 Key 下问成绩 / 课表：仍走 `jiaowu_*` / 课表工具，而非 `web_search`。
4. 常用网站打开仍走 `web_nav_*`。

---

## 8. 实现提示（非契约）

- Prompt 可用两段字符串拼接，避免维护两份超长全文时漏改公共部分。
- 搜索源为 Bing CN → 搜狗自动降级；双失败返回 `resultCount:0` + `error`，本期不做独立重试 UI。
