# Spec：农屿 Agent 流式 Markdown 渲染（方案 A，对齐 Web）

| 项       | 内容                                                                        |
| -------- | --------------------------------------------------------------------------- |
| 应用     | `apps/nongyu-rn-app`                                                        |
| 需求类型 | **基建**                                                                    |
| PRD      | `docs/forhuman/rawprds/nongyu-rn-app/Shell/农屿Agent流式Markdown渲染PRD.md` |
| 对齐     | `docs/nongyu-web-admin/specs/智慧助手流式Markdown渲染.md`                   |
| 状态     | **已实现**                                                                  |
| 技术方案 | 本期跳过（与 Web 同构，改动面小）                                           |
| 实施计划 | `docs/nongyu-rn-app/plans/农屿Agent流式Markdown渲染.md`                     |

---

## 1. 背景

**Why**：RN 流式阶段用纯 `Text`，完成后才 `react-native-markdown-display`，与 Web 问数助手不一致，且结束有样式硬切。  
**What**：流式也走 Markdown；`remend` 在 parse 前补半截语法；heal options 与 Web 一致。

---

## 2. 目标

1. `status` 为 `streaming` / `pending` 且已有 `content` 时，正文以 Markdown 渲染（非纯 `Text`）。
2. 流式展示：`remend(content, options)` 再交给 Markdown；`done` / `stopped` / `error` 用原始 `content`。
3. remend options 与 Web 对齐：`linkMode: "text-only"`，`katex: false`，`inlineKatex: false`。
4. 不改 `agentChatRunner` 的 40ms 节流与会话持久化（存原始 content）。
5. 保留现有 `useMarkdownStyles` 视觉。

---

## 3. 边界（非目标）

- 不引入 Streamdown / react-native-streamdown / enriched-markdown。
- 不抽 `packages/` 共享 heal；本期仅 `apps/nongyu-rn-app` 声明 `remend: "catalog:"`。
- 不加流式 caret；不改工具折叠、空态、用户气泡。
- 不改 `nongyu-agent-sdk`。

---

## 4. Grill 共识

| 决策 | 结论                                     |
| ---- | ---------------------------------------- |
| 归类 | 基建                                     |
| 方案 | 对齐 Web A：remend + 现有 RN Markdown 库 |
| 范围 | `AssistantMessage.tsx` + 依赖            |
| 节流 | 保持现有 40ms                            |

---

## 5. 详细需求

### 5.1 `AssistantMessage`

- 删除 `useMarkdown`（流式纯 Text / 完成 Markdown）分支。
- 有 `content` 时始终：
  - `source = isStreaming ? remend(content, STREAM_HEAL_OPTIONS) : content`
  - `<Markdown style={markdownStyles}>{source}</Markdown>`
- `isStreaming`：`status === "streaming" \|\| status === "pending"`。
- 更新文件头注释：不再写「流式用纯 Text」。

### 5.2 依赖

- `apps/nongyu-rn-app/package.json` 增加 `remend: "catalog:"`（catalog 已有 `^1.3.1`）。

---

## 6. 业务流程

同 Web：流式 flush → UI remend → Markdown；完成 → 原文 Markdown；持久化不写 heal 结果。

---

## 7. 验收标准

| #   | 场景                          | 期望                             |
| --- | ----------------------------- | -------------------------------- |
| 1   | 流式 `**加粗**` / 标题 / 列表 | 生成中可见 Markdown 排版         |
| 2   | 生成结束                      | 无「纯 Text → Markdown」硬切闪烁 |
| 3   | 历史消息重开                  | 仍为 Markdown，内容未写入 heal   |
| 4   | 工具卡片                      | 折叠/展开与原先一致              |
