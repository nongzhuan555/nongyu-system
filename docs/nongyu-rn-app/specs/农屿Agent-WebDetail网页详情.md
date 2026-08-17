# Spec：农屿 Agent WebDetail（网页详情抓取）

| 项       | 内容                                                                                   |
| -------- | -------------------------------------------------------------------------------------- |
| 应用     | `packages/nongyu-agent-sdk`（增强内置工具）；`apps/nongyu-rn-app`（挂载与 Prompt）     |
| 需求类型 | **基建**                                                                               |
| 复用     | 现有 `BuiltinTools/WebFetchTool` 抓取与编码逻辑；注入方式对齐 `web_search`（自有 Key） |
| PRD      | `docs/forhuman/rawprds/nongyu-rn-app/Shell/农屿Agent-WebDetail网页详情PRD.md`          |
| 入口     | 农屿 AI 对话（`getOrCreateNongyuAgent`）                                               |
| 状态     | **已确认并落地（待人工回归）**（2026-08-17）                                           |
| 技术方案 | **本期跳过**                                                                           |

---

## 1. 背景

**Why**：用户希望在对话中直接查看某 URL 的网页详情；仅有搜索摘要不够，需正文级内容。  
**What**：将 SDK 已有 `web_fetch` 增强为面向 Agent 的 `web_detail`：解码 → 抽取可读正文 → 无意义/鉴权判定；并在 RN 自有 Key 通道注册。

现有缺口：

- `web_fetch` 未从 SDK 主入口导出，RN Agent 未注册。
- 返回 raw HTML，上下文成本高。
- 无统一「无权限 / 无意义内容」契约。

---

## 2. 目标

| #   | 目标                                            | 验收                                               |
| --- | ----------------------------------------------- | -------------------------------------------------- |
| G1  | 工具对外名为 `web_detail`，SDK 主入口可导出     | `import { webDetailTool } from "nongyu-agent-sdk"` |
| G2  | 仅 `source === "user"` 时注入                   | 平台代理工具表不含 `web_detail`                    |
| G3  | 成功返回可读正文 + 元信息（非整页 HTML）        | 结果含 `ok: true`、`text`、`title?`、`encoding`    |
| G4  | 无意义/鉴权类返回结构化失败，Agent 提示无权限   | `ok: false` + 统一 `message`，不编造正文           |
| G5  | 自动编码识别（Content-Type / HTML meta 兜底）   | GBK 等公共页可读                                   |
| G6  | 无需用户审批；无 Generative UI 卡片             | 不弹确认框；结果回灌后口述                         |
| G7  | systemPrompt（自有 Key）说明何时用 `web_detail` | 与 `web_search` 并列；校内专用工具优先             |

---

## 3. 边界（非目标）

- 不携带用户 Cookie / 登录态抓取需鉴权系统
- 不使用无头浏览器做 CSR 完整渲染
- 不做平台代理路径的网页抓取
- 不做 Generative UI 详情卡片
- 不写 `needsApproval`
- 不新增独立 tech 文档
- 不改变 `web_nav_*` / 教务 / 二课等专用工具语义

---

## 4. Grill 共识

| 决策      | 结论                                                                   |
| --------- | ---------------------------------------------------------------------- |
| 归类      | 基建                                                                   |
| 与旧工具  | 增强原 `WebFetchTool`；对外名 **`web_detail`**（不再暴露 `web_fetch`） |
| 返回      | 可读纯文本 + 元信息；失败结构化                                        |
| 无权限    | 401/403、登录墙关键词、正文过短/无意义 → 统一提示                      |
| 注入条件  | 与 `web_search` 相同：仅自有 Key                                       |
| 审批 / UI | 不审批；无卡片                                                         |
| 文档      | 短 Spec；跳过 tech；确认后写实施计划再编码                             |

---

## 5. 详细需求

### 5.1 工具契约

| 字段            | 说明                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `name`          | `web_detail`                                                                                                              |
| `description`   | 获取指定 URL 的网页可读详情（自动编码）；适用于用户要求查看某网页正文。仅公共、可匿名访问页面可靠；疑似鉴权时返回无权限。 |
| 输入            | `url: string`（完整 URL）；`encoding?: string`（可选手动编码）                                                            |
| `needsApproval` | `false`                                                                                                                   |
| `render`        | 不声明                                                                                                                    |

**成功输出（示例形状）：**

```json
{
  "ok": true,
  "url": "https://example.com/page",
  "encoding": "utf-8",
  "title": "页面标题",
  "text": "可读正文……",
  "links": [{ "text": "师资队伍", "url": "https://example.com/szdw.htm" }],
  "truncated": false
}
```

`links`：从页面 `<a href>` 解析的绝对 URL（去重、限量），供 Agent 按锚文本挑选下一级再调 `web_detail`。

**失败输出（无权限 / 无意义）：**

```json
{
  "ok": false,
  "url": "https://example.com/private",
  "reason": "no_permission",
  "message": "无此权限查看该页面内容"
}
```

其它网络/HTTP 失败：可抛错或返回 `ok: false` + `reason: "fetch_error"`（实现任选其一，但 message 需可被模型转述）；**鉴权类必须走 `no_permission` 文案，不得伪装成成功正文。**

### 5.2 抓取与编码

1. `GET` URL；超时建议 15s；带常见浏览器 UA / Accept / Accept-Language。
2. 读 `ArrayBuffer`，用 Content-Type charset → 可选入参 `encoding` → HTML `<meta charset>` / `http-equiv` 兜底 → 默认 UTF-8；经 `iconv-lite` 解码（复用现有 GBK 别名逻辑）。
3. 不跟随到需登录的深度态；普通 HTTP 重定向可按 fetch 默认行为。

### 5.3 正文抽取

1. 从 HTML 取 `<title>`（若有）。
2. 去除 `script` / `style` / `noscript` / 注释后，剥标签得纯文本；折叠空白。
3. 正文长度上限（建议 **30_000** 字符）；超出截断并设 `truncated: true`（避免 100k HTML 直灌）。

### 5.4 「无意义 / 无权限」判定（满足任一即可判失败）

| 条件                                                                                                                         | `reason`        |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------- |
| HTTP 状态 401 / 403                                                                                                          | `no_permission` |
| 可读正文过短（建议有效字符 &lt; 80）且无实质 title                                                                           | `no_permission` |
| 正文或 title 命中登录墙关键词（如：登录、登陆、无权、未授权、请先登录、身份认证、SSO、Access Denied、Unauthorized、Sign in） | `no_permission` |

失败时 **不返回** 大段 `text`（可省略或极短说明），统一 `message: "无此权限查看该页面内容"`。

> 说明：无法 100% 区分「空页面」与「鉴权」；本期约定统一对用户表述为无权限，避免模型编造。

### 5.5 SDK 导出

- 实现文件可保留/重命名为 `WebFetchTool.ts` 或 `WebDetailTool.ts`（实现细节）；**导出名**为 `webDetailTool`，工具 `name` 为 `web_detail`。
- `packages/nongyu-agent-sdk/src/index.ts` 导出 `webDetailTool`。
- 不再向消费方导出旧名 `web_fetch` / `webFetchTool`（仓库内无 RN 引用则可直接替换）。

### 5.6 RN 注入

在 `getOrCreateNongyuAgent`，自有 Key 分支：

```text
tools = { ...baseTools, web_search: webSearchTool, web_detail: webDetailTool }
```

平台代理：不加 `web_search` / `web_detail`。

### 5.7 systemPrompt

仅自有 Key 追加段需包含清晰分工（避免模型习惯性只调 search）：

- **已有具体 URL / 要看链接正文** → 必须 `web_detail`，禁止只用 `web_search` 代替。
- **尚无 URL 的关键词检索** → 先 `web_search`；需要某条结果正文时再 `web_detail`。
- 打开常用网站白名单 → `web_nav_*`。
- 教务 / 二课 / 课表 / 广场 / 设置等仍优先专用工具。
- 若工具返回无权限，如实告知用户，勿编造页面内容。

---

## 6. 业务流程

```text
用户：「帮我看看这个链接里写了什么」+ URL
  →（自有 Key）Agent 调用 web_detail({ url })
      → ok:true → 基于 text 总结作答
      → ok:false reason=no_permission → 告知「无此权限查看该页面内容」
  →（平台代理）无此工具；引导配置自有 Key 或改用其它能力
```

---

## 7. 验收标准

- [x] 自有 Key：公开页 URL → `web_detail` 成功，回答基于正文；无确认弹窗。（代码侧已注册；待人工回归）
- [x] 自有 Key：明显登录墙 / 401/403 → 提示无权限，不编造。（逻辑已实现；待人工回归）
- [x] 平台代理：工具未注册，不应出现 `web_detail` 调用。（代码侧）
- [ ] GBK 公共页解码后中文可读。（待人工）
- [x] 超长页截断，`truncated: true`，不拖垮上下文。（代码侧）
- [x] 相关 `type-check` 通过。

---

## 8. 实现提示（非契约）

- 注入与 Prompt 拼装直接对齐 `农屿Agent-WebSearch自有Key` Spec 的既有结构。
- meta charset 可用简单正则从 head 截取，不必引入 HTML 解析库。
- 关键词表可模块内常量，后续按需扩展。

---

## 9. 修订记录

| 日期       | 说明                                                  |
| ---------- | ----------------------------------------------------- |
| 2026-08-17 | 初版：Grill 全推荐；跳过 tech；待 Spec 确认           |
| 2026-08-17 | Spec 确认并实现（`webDetailTool` + RN 自有 Key 注入） |
