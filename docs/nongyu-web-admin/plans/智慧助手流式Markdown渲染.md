# Plan：智慧助手流式 Markdown 渲染（方案 A）

## 步骤

1. catalog + web-admin 增加 `remend`，`pnpm install`。
2. 改 `AssistantMarkdown.tsx`：`isStreaming` + remend。
3. 改 `MessageList.tsx`：始终 Markdown，传入 `isStreaming`。
4. `pnpm --filter nongyu-web-admin type-check` / lint；本地 dev 人工验收。

## 风险

- 超长回复整篇 re-parse 可能轻微卡顿；问数场景通常可接受。若卡再升 Streamdown / 切块。
- 未闭合 fence 行为依赖 commonmark，属预期。
