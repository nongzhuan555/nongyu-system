# Spec：Agent 常用网站搜索与打开

| 项       | 内容                                                                               |
| -------- | ---------------------------------------------------------------------------------- |
| 应用     | `apps/nongyu-rn-app`                                                               |
| 需求类型 | **基建**（Agent Tool；不改首页 WebNav UI）                                         |
| 复用     | `WEB_NAV_ITEMS`、`openAppUrl`、`confirm` / `needsApproval`、settingsTools 注册方式 |
| 入口     | 农屿 AI 对话                                                                       |
| 状态     | **已实现**                                                                         |

---

## 1. 背景

首页「常用网站」支持本地名称搜索与按网页跳转偏好打开；Agent 尚不能完成「搜图书馆 / 打开教务网」类意图。

**Why**：对话内完成站点检索与打开，降低回首页点选成本。  
**What**：两个 Tool——搜索 + 白名单打开；打开前确认；复用现有数据源与 `openAppUrl`。

---

## 2. 目标

1. Agent 可按关键词搜索常用网站（空关键词返回全量名称列表摘要）。
2. Agent 可打开列表内站点；走 `openAppUrl`（应用内 WebView / 系统浏览器）。
3. 打开须用户确认；取消不打开。
4. 挂到现有 Agent；更新 `systemPrompt`。
5. 跳过 tech；本 Spec 确认后编码。

---

## 3. 边界（非目标）

- 不改首页 WebNav UI / 假延迟搜索体验。
- 不做 Generative UI 站点卡片（本轮纯文本 / JSON）。
- 不允许打开白名单外任意 URL。
- 不新增远程站点 API。

---

## 4. 详细需求

### 4.1 工具

| Tool 名          | 作用                                                     |
| ---------------- | -------------------------------------------------------- |
| `web_nav_search` | 按名称包含过滤；返回 `{ items: { text, url }[], total }` |
| `web_nav_open`   | 按站点名打开；`needsApproval: true`                      |

### 4.2 `web_nav_search`

- **输入**：`keyword?: string`（trim；空或省略 → 全量）。
- **匹配**：与首页一致——`item.text.includes(keyword)`（区分大小写按现网：中文为主，保持 `includes`）。
- **输出**：JSON；`total` 为命中数；可截断展示由 Agent 口述（实现可不截断数组，站点约 32 个可接受）。

### 4.3 `web_nav_open`

- **输入**：`name: string`（站点显示名，如「教务网」）。
- **解析**：
  1. 先精确匹配 `text === name.trim()`；
  2. 否则 `text.includes(name)`；唯一命中则用该条；
  3. 0 命中 → `{ ok: false, error: "未找到站点…" }`；
  4. 多命中 → `{ ok: false, error: "…", candidates: [...] }`，不打开。
- **确认**：`needsApproval`；确认框标题「确认打开网站」，文案含站点名（及可选 url 简述）。
- **执行**：`await openAppUrl(url, { label: text })`；成功 `{ ok: true, opened: { text, url } }`。

### 4.4 注册

- 模块：如 `src/modules/home/agent/webNavTools.ts`（或同级）。
- `agent.ts`：`tools` 展开 + `systemPrompt` 补充「常用网站搜索/打开 → web_nav_search / web_nav_open」。
- `toolApproval.onApprove`：对 `web_nav_open` 展示专用确认文案（可与 settings 并列分支）。

### 4.5 自然语言示例

| 用户说法                           | 期望                          |
| ---------------------------------- | ----------------------------- |
| 「有哪些常用网站」「搜一下图书馆」 | `web_nav_search`              |
| 「打开教务网」「帮我开图书馆」     | `web_nav_open`（确认后打开）  |
| 「打开 https://evil.com」          | 拒绝 / 不调任意 URL；仅白名单 |

---

## 5. 业务流程

```text
用户自然语言
  → web_nav_search → 返回列表 → Agent 口述
  → web_nav_open → 确认框 → 确认则 openAppUrl / 取消则拒绝结果
```

---

## 6. 验收标准

- [x] 「搜学院」类可返回命中列表，与首页过滤逻辑一致。
- [x] 「打开教务网」弹确认；确认后按网页跳转偏好打开；取消不打开。
- [x] 白名单外 URL / 未知名无法打开。
- [x] 多命中不擅自打开，返回 candidates。
- [x] `type-check` 通过（本改动相关文件无新增错误）。

---

## 7. 决策记录（grill）

| 项      | 结论               |
| ------- | ------------------ |
| 类型    | 基建               |
| Tools   | search + open      |
| 白名单  | 仅 `WEB_NAV_ITEMS` |
| 确认    | open 须确认        |
| UI 卡片 | 本轮不做           |
| tech    | 跳过               |

---

## 8. 修订记录

| 日期       | 说明               |
| ---------- | ------------------ |
| 2026-08-15 | 初版：grill 全推荐 |
| 2026-08-15 | Spec 确认并实现    |
