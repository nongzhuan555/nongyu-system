# Plan：农屿 Agent 流式 Markdown 渲染

## 步骤

1. rn-app 声明 `remend: "catalog:"`，`pnpm install`。
2. 改 `AssistantMessage.tsx`：始终 Markdown + 流式 remend；options 对齐 Web。
3. 更新 Web Spec 边界（RN 已跟进）。
4. `pnpm --filter nongyu-rn-app type-check` / lint。

## 风险

- 长文 + 整篇 Markdown 重 parse 可能掉帧；已有 40ms 节流缓解。若真机卡再调节流或升块级方案。
