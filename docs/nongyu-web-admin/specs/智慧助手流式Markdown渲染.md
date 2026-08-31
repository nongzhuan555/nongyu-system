# Spec：智慧助手流式 Markdown 渲染（方案 A）

| 项       | 内容                                                                    |
| -------- | ----------------------------------------------------------------------- |
| 应用     | `apps/nongyu-web-admin`                                                 |
| 需求类型 | **基建**                                                                |
| PRD      | `docs/forhuman/rawprds/nongyu-web-admin/智慧助手流式Markdown渲染PRD.md` |
| 前置     | `智慧助手一期.md`、`管理端壳层与智慧助手UI对齐.md`                      |
| 状态     | **已实现（Web）；RN 见同构 Spec**                                       |
| 技术方案 | 本期跳过（改动面小）                                                    |
| 实施计划 | `docs/nongyu-web-admin/plans/智慧助手流式Markdown渲染.md`               |

---

## 1. 背景

**Why**：流式阶段用纯 `<p>`，完成后才 `AssistantMarkdown`，观感落后于主流 AI 对话，且结束时有样式硬切。  
**What**：流式阶段也走 Markdown 渲染；用 `remend` 在 parse 前补全半截语法。

---

## 2. 目标

1. `status` 为 `streaming` / `pending` 且已有 `content` 时，正文以 Markdown 渲染（非纯文本）。
2. 流式展示前对字符串调用 `remend`；`done` / `stopped` / `error` 使用原始 `content`（不再 heal）。
3. 会话持久化、SDK `text:delta`、节流逻辑不变；存盘内容仍为原始流式文本。
4. 保留现有 `assistant-md` 视觉样式与 GFM（`remark-gfm`）。

---

## 3. 边界（非目标）

- 不引入 Streamdown；不做按块 memo / 增量 AST。
- 不改 `nongyu-agent-gui`、不改 `nongyu-agent-sdk`。
- RN 同构见 `docs/nongyu-rn-app/specs/农屿Agent流式Markdown渲染.md`（本期不抽共享 packages，两端各自声明 remend）。
- 不加流式 caret；不加 `rehype-sanitize`（另开刀）。
- 不改工具卡片 / SQL / 图表渲染。

---

## 4. Grill 共识

| 决策     | 结论                                      |
| -------- | ----------------------------------------- |
| 归类     | 基建                                      |
| 方案     | A：`remend` + 现有 `react-markdown`       |
| 范围     | 仅管理端问数助手 `MessageList` / Markdown |
| 复用     | 先 Web 验证；RN 后续同构 heal             |
| caret    | 本期不做                                  |
| sanitize | 本期不做                                  |

---

## 5. 详细需求

### 5.1 `AssistantMarkdown`

- Props：`content: string`；`isStreaming?: boolean`（默认 `false`）。
- `isStreaming === true`：`renderSource = remend(content, options)`；否则 `renderSource = content`。
- `remend` options（本期固定）：`linkMode: "text-only"`（半截链接只显示文字）；`katex: false`；`inlineKatex: false`。
- `content` trim 为空时仍不渲染（与现行为一致）。
- 继续 `react-markdown` + `remark-gfm` + 现有 className。

### 5.2 `MessageList` / 内联 `AssistantMessage`

- 去掉「流式用 `<p>`、完成用 Markdown」分支。
- 有 `content` 时始终 `<AssistantMarkdown content={...} isStreaming={isStreaming} />`。
- `isStreaming` 定义保持：`status === "streaming" || status === "pending"`。

### 5.3 依赖

- `pnpm-workspace.yaml` catalog 增加 `remend`。
- `apps/nongyu-web-admin/package.json` dependencies 声明 `remend: "catalog:"`。

---

## 6. 业务流程

1. 用户发送 → `useAgentChat` 流式更新 `message.content` / `status`。
2. UI 每次渲染：若 streaming → remend → react-markdown；否则原文 → react-markdown。
3. 完成 / 停止 → `isStreaming=false`，用原文渲染，无组件类型切换。

---

## 7. 验收标准

| #   | 场景                        | 期望                                             |
| --- | --------------------------- | ------------------------------------------------ |
| 1   | 流式出现 `**加粗**`         | 闭合前即可看到加粗倾向，不长期露出裸 `**`        |
| 2   | 流式标题 / 列表             | 生成过程中即有标题字号与列表缩进                 |
| 3   | 流式未闭合代码围栏          | 后续内容按代码块观感展示（解析器惯例）           |
| 4   | 生成结束                    | 无「纯文本突然变 Markdown」闪一下                |
| 5   | 刷新 / 切会话再打开历史消息 | 历史仍为 Markdown；内容与改前一致（未写入 heal） |
| 6   | 工具卡片仍出现              | SQL/图表等工具 UI 不受影响                       |

本地：`pnpm --filter nongyu-web-admin dev`，打开智慧助手自测上表。
