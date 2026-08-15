# AI 生成 UI 渲染能力 - 实施计划

| 项       | 内容                                                      |
| -------- | --------------------------------------------------------- |
| 版本     | v0.1（待审核）                                            |
| 日期     | 2026-08-15                                                |
| 需求类型 | 基建                                                      |
| 上游     | `docs/nongyu-rn-app/tech/Agent生成UI渲染能力-技术方案.md` |
| 关联     | `packages/nongyu-agent-sdk`、`apps/nongyu-rn-app`         |
| 重点     | 搭好 AI 生成 UI 基建；流式渲染流畅不卡顿                  |

---

## 0. 阅读前提

本计划是 SDD 步骤 4。上游技术方案已审核（待你确认本计划后进入编码）。本计划聚焦 **基建落地** 与 **流式渲染性能**，业务卡片（二课活动等）不在本期交付，仅用一个 mock 示例验证机制。

---

## 1. 基线决策（对齐技术方案第 8 节）

| #   | 事项          | 本计划采用                           | 说明                                                                                              |
| --- | ------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| 1   | 需求归类      | 基建                                 | 已确认                                                                                            |
| 2   | Spec 是否先行 | 不单独写 Spec                        | 本基建以技术方案为 WHAT 边界；mock 示例无业务语义，无需 Spec。真实业务卡片（二课等）各自另开 Spec |
| 3   | 示例卡片      | **mock 数据的 `WeatherCard`**        | 不依赖后端，纯前端验证机制；二课活动卡片留到二课 Spec                                             |
| 4   | Markdown      | 引入 `react-native-markdown-display` | 配合「流式期间渲染纯文本、完成后切换 Markdown」策略，避免逐 token 重解析                          |
| 5   | callId 兼容   | 保留降级                             | `callId` 缺失时按 `toolName && output===undefined` 回填，兼容旧调用方                             |

> 如以上任一决策需调整，请在审核时指出，我会回改技术方案与本计划。

---

## 2. 范围

### 2.1 本期交付（基建）

1. **SDK 侧（加法）**：`ToolDefinition.render` 声明、`ToolCallRecord` 扩展（`callId/status/error/renderComponent`）、流式块带 `callId`、`useAgentChat` 按 `callId` 回填 + 文本节流配置项。
2. **RN 侧 `agent-ui` 框架**：注册表、`ToolCallView`、`AssistantMessage`、`MessageList`、`register.ts`、mock `WeatherCard`。
3. **`app/ai.tsx`**：替换占位页为真实聊天页，接入 `useAgentChat` + `agent-ui`。
4. **流式渲染流畅性**：文本节流、行级 memo、Markdown 延迟渲染、自动滚动策略。

### 2.2 不做

- 二课活动、课表、成绩等真实业务卡片及其后端接口。
- Declarative 模式（JSON UI 树）。
- 多 Agent 编排改动、上下文管理改动。
- 持久化会话历史（另议）。

---

## 3. 实施阶段分解

每个阶段含：任务、产出、退出标准。

### S1 · SDK 类型与注册表扩展（基建地基）

| 任务                                                                        | 文件                                          |
| --------------------------------------------------------------------------- | --------------------------------------------- |
| `ToolDefinition` 增 `render?: ToolRenderSpec`；`Tool` 增 `renderComponent?` | `packages/nongyu-agent-sdk/src/types/tool.ts` |
| `ToolCallRecord` 增 `callId/status/error/renderComponent`                   | `src/types/agent.ts`                          |
| 流式块 `tool:call`/`tool:result` 增 `callId`；新增 `tool:error`             | `src/types/stream.ts`                         |
| `ToolRegistry` 暴露 `getRenderComponent(name)`                              | `src/core/tool/registry.ts`                   |
| `tool()` 工厂透传 `render`                                                  | `src/core/tool/index.ts`                      |

- 产出：类型与注册表加法扩展。
- 退出标准：`pnpm --filter nongyu-agent-sdk type-check` 通过；现有调用方无需改动即可编译。

### S2 · AgentLoop 透传 callId 与 renderComponent

| 任务                                                                             | 文件                    |
| -------------------------------------------------------------------------------- | ----------------------- |
| 解析模型 `ToolCall.id` → 写入 `tool:call`/`tool:result`/`tool:error` 的 `callId` | `src/core/agent/loop/*` |
| `renderComponent` 从 `ToolRegistry.get(toolName).renderComponent` 取并透传       | 同上                    |
| 工具执行异常 → 产出 `tool:error` 流式块（而非吞掉）                              | 同上                    |

- 产出：流式块字段齐全。
- 退出标准：单测——mock 模型返回 2 个同名 `tool_call`，断言两个 `callId` 都正确透传到 `tool:call`/`tool:result`，且 `renderComponent` 非空。

### S3 · useAgentChat 改造（性能关键）

| 任务                                                                             | 文件                                    |
| -------------------------------------------------------------------------------- | --------------------------------------- |
| `tool:call` 写入 `ToolCallRecord{callId,status:'executing',renderComponent}`     | `src/hooks/useAgentChat.ts`             |
| `tool:result` 按 `callId` 回填 `output/duration/status:'done'`                   | 同上                                    |
| `tool:error` 按 `callId` 标记 `status:'error',error`                             | 同上                                    |
| 新增配置 `textUpdateThrottleMs?: number`（默认 0=不节流，保持现行为）            | `src/hooks/types.ts`、`useAgentChat.ts` |
| 文本节流：`text:delta` 累积到 ref，按 `textUpdateThrottleMs` 节流 flush 到 state | `useAgentChat.ts`                       |
| `callId` 缺失时降级按 `toolName && output===undefined` 回填                      | `useAgentChat.ts`                       |

- 产出：hook 支持并发同名工具正确回填 + 可配置文本节流。
- 退出标准：单测——并发同名工具回填不错位；节流开启时 flush 频率 ≤ 1000/throttleMs 且最终文本完整。

### S4 · RN agent-ui 框架

| 任务                                                          | 文件                                          |
| ------------------------------------------------------------- | --------------------------------------------- |
| `ToolRenderProps` 契约 + `registerToolUI/getToolUI` 注册表    | `apps/nongyu-rn-app/src/agent-ui/registry.ts` |
| `ToolCallView`：查注册表 → 渲染 / fallback `ToolCallChip`     | `src/agent-ui/ToolCallView.tsx`               |
| `AssistantMessage`：文本段 + 工具调用段组合                   | `src/agent-ui/AssistantMessage.tsx`           |
| `MessageList`：FlashList + 行级 `React.memo` + `keyExtractor` | `src/agent-ui/MessageList.tsx`                |
| `register.ts`：启动时注册 mock `WeatherCard`                  | `src/agent-ui/register.ts`                    |
| mock `WeatherCard`：三态（骨架/数据/错误）+ `onAction` 回流   | `src/components/agent/WeatherCard.tsx`        |
| mock `weather_query` 工具（前端假数据，延迟 800ms）           | `src/agent-ui/mock-weather-tool.ts`           |

- 产出：渲染框架 + 一个端到端 mock 示例。
- 退出标准：真机——发送「北京天气」→ Agent 调 `weather_query` → 卡片先骨架后数据；点击卡片「详细」按钮 → 回流为用户消息 → Agent 回复。

### S5 · app/ai.tsx 接入

| 任务                                                                   | 文件                             |
| ---------------------------------------------------------------------- | -------------------------------- |
| 替换占位页为聊天页：`useAgentChat` + `MessageList` + 输入栏 + 停止按钮 | `apps/nongyu-rn-app/app/ai.tsx`  |
| 创建 Agent 实例（systemPrompt + mock 工具）                            | `src/agent/agent.ts`（新增）     |
| 启动时调用 `register.ts`                                               | `app/_layout.tsx` 或 `ai.tsx` 内 |
| `textUpdateThrottleMs` 设为 40ms（流式流畅性）                         | `ai.tsx`                         |

- 产出：可对话 + 内联渲染 UI 的 AI 页。
- 退出标准：真机连续对话 10 轮无卡顿；流式文本肉眼顺滑；工具卡片三态正确。

### S6 · 文档与验收

| 任务                                    | 文件                                       |
| --------------------------------------- | ------------------------------------------ |
| 更新 `TECH-DESIGN.md` 增「生成 UI」小节 | `packages/nongyu-agent-sdk/TECH-DESIGN.md` |
| 更新 RN 开发文档增 `agent-ui` 说明      | `docs/nongyu-rn-app/开发文档.md`           |
| BugLog（如有修复现有 callId 错位 bug）  | `docs/common/BugLog.md`                    |

- 退出标准：文档评审通过。

---

## 4. 流式渲染流畅性专项（核心）

目标：token 流式推送时 UI 不卡顿、不掉帧、不抢用户滚动。按收益从高到低落地。

### 4.1 文本节流（收益最高）

**问题**：现 `useAgentChat.ts:122` 每个 `text:delta` 都 `setMessages` 全量 map，长回复数百次渲染。

**方案**：新增 `textUpdateThrottleMs`（RN 设 40ms）。`text:delta` 时把 `fullText` 写入 ref，用定时器/`requestAnimationFrame` 节流 flush 到 state。最终 `agent:complete` 强制 flush 剩余。

```ts
// 伪代码
const pendingTextRef = useRef("");
const flushTimerRef = useRef<number | null>(null);
const scheduleFlush = () => {
  if (flushTimerRef.current != null) return;
  flushTimerRef.current = setTimeout(() => {
    flushTimerRef.current = null;
    const text = pendingTextRef.current;
    setMessages((prev) => prev.map((m) => (m.id === aiMsgId ? { ...m, content: text } : m)));
  }, throttleMs) as unknown as number;
};
// text:delta → pendingTextRef.current = fullText; scheduleFlush();
// agent:complete → clearTimeout; 立即 flush 最终 text
```

收益：渲染次数从「每 token 一次」降到「每 40ms 一次」，长回复 500 token → 约 25 次渲染。

### 4.2 行级 memo（收益高）

**问题**：`messages` 数组引用每次 setState 都变，所有行重渲。

**方案**：`MessageRow = React.memo(...)`，比较 `message.id + message.status + message.content.length + toolCalls 长度`。非流式行因内容不变直接跳过。FlashList 的 `renderItem` 用稳定引用（`useCallback`）。

### 4.3 Markdown 延迟渲染（收益高）

**问题**：逐 token 解析 Markdown 极重。

**方案**：`AssistantMessage` 内——`status==='streaming'` 时渲染纯 `<Text>`（保留换行）；`status==='done'` 切换 `<Markdown>`。流式期间只显示纯文本，完成后一次性渲染富文本。用户感知：流式时是「打字机纯文本」，完成瞬间变富文本，无卡顿。

### 4.4 工具卡片独立 memo（收益中）

**方案**：`ToolCallView = React.memo(...)`，依赖 `callId + status + output`。文本 token 流不触发卡片重渲（卡片只读 `toolCalls` 项，文本节流只改 `content`）。

### 4.5 自动滚动策略（收益中）

**方案**：用 `onContentSizeChange` 判断「用户在底部时才跟随滚动」，而非每个 token 滚。用户上滑阅读时绝不抢滚动。底部判断用 `scrollOffset < threshold`。

### 4.6 稳定回调与引用（收益中）

**方案**：`onAction`、`renderItem`、`keyExtractor` 全部 `useCallback`/模块级常量；`ToolRenderProps` 不在渲染内构造新对象（`args/output` 直接取自 `tc`，不 spread 重建）。

### 4.7 长列表防护（收益中）

**方案**：对话超 100 条时，FlashList 自动回收；工具卡片内若需列表，用横向 `FlashList` 或截断（前 5 +「查看更多」跳页），不在对话内嵌纵向长列表。

### 4.8 不做的事

- 不上 `InteractionManager` 把渲染切到 idle（流式需即时反馈）。
- 不上 `content-visibility`（RN 不支持）。
- 不为每个 token 开 JS 线程 worklet（文本更新属 UI 线程轻量更新，节流已足够）。

---

## 5. 文件清单与改动矩阵

| 文件                                                      | 动作                 | 阶段  |
| --------------------------------------------------------- | -------------------- | ----- |
| `packages/nongyu-agent-sdk/src/types/tool.ts`             | 改（加法）           | S1    |
| `packages/nongyu-agent-sdk/src/types/agent.ts`            | 改（加法）           | S1    |
| `packages/nongyu-agent-sdk/src/types/stream.ts`           | 改（加法）           | S1    |
| `packages/nongyu-agent-sdk/src/core/tool/registry.ts`     | 改（加法）           | S1    |
| `packages/nongyu-agent-sdk/src/core/tool/index.ts`        | 改（加法）           | S1    |
| `packages/nongyu-agent-sdk/src/core/agent/loop/*`         | 改（透传）           | S2    |
| `packages/nongyu-agent-sdk/src/hooks/useAgentChat.ts`     | 改（回填+节流）      | S3    |
| `packages/nongyu-agent-sdk/src/hooks/types.ts`            | 改（加配置）         | S3    |
| `packages/nongyu-agent-sdk/test/*.test.ts`                | 新增                 | S2/S3 |
| `apps/nongyu-rn-app/src/agent-ui/registry.ts`             | 新增                 | S4    |
| `apps/nongyu-rn-app/src/agent-ui/ToolCallView.tsx`        | 新增                 | S4    |
| `apps/nongyu-rn-app/src/agent-ui/AssistantMessage.tsx`    | 新增                 | S4    |
| `apps/nongyu-rn-app/src/agent-ui/MessageList.tsx`         | 新增                 | S4    |
| `apps/nongyu-rn-app/src/agent-ui/register.ts`             | 新增                 | S4    |
| `apps/nongyu-rn-app/src/agent-ui/mock-weather-tool.ts`    | 新增                 | S4    |
| `apps/nongyu-rn-app/src/components/agent/WeatherCard.tsx` | 新增                 | S4    |
| `apps/nongyu-rn-app/src/agent/agent.ts`                   | 新增                 | S5    |
| `apps/nongyu-rn-app/app/ai.tsx`                           | 改（替换占位）       | S5    |
| `apps/nongyu-rn-app/package.json`                         | 改（加 markdown 库） | S4    |

---

## 6. 测试方案

| 层       | 测试                                                          | 工具                                          |
| -------- | ------------------------------------------------------------- | --------------------------------------------- |
| SDK 单测 | callId 透传、并发同名回填、节流 flush 完整性、tool:error 标记 | vitest + mock ModelProvider                   |
| RN 组件  | WeatherCard 三态渲染、ToolCallChip fallback、onAction 回流    | react-native-testing-library                  |
| 集成     | 真机连续对话 10 轮 + 工具调用 + 停止/中断                     | 真机（Android 优先）                          |
| 性能     | 流式期间 FPS ≥ 55、长回复 500 token 渲染次数 ≤ 30             | Reanimated `useFrameCallback` 或 Perf Monitor |

### 验收清单（真机）

- [ ] 发「北京天气」→ 卡片骨架 → 数据卡片出现
- [ ] 流式文本期间无肉眼卡顿、不掉帧
- [ ] 用户上滑时不被自动滚动抢回
- [ ] 停止按钮中断后卡片停在当前状态，不崩
- [ ] 工具失败 → 卡片显示错误态，文本段不受影响
- [ ] 连续 10 轮对话内存稳定（无泄漏）

---

## 7. 风险与回滚

| 风险                                 | 对策                                         | 回滚                                 |
| ------------------------------------ | -------------------------------------------- | ------------------------------------ |
| SDK 改动破坏现有调用方               | 全部加法 + callId 降级                       | revert SDK 改动，旧调用方不受影响    |
| 节流导致末尾 token 丢失              | `agent:complete` 强制 flush                  | 关闭节流（`throttleMs=0`）回到原行为 |
| Markdown 库引入体积/兼容问题         | 仅在 `done` 态渲染，流式不依赖               | 退回纯 Text，不渲染 Markdown         |
| FlashList 与 memo 配合不当导致空白行 | `estimatedItemSize` 准确 + keyExtractor 稳定 | 降级 FlatList                        |
| 真机低端 Android 卡顿                | 节流提到 60ms + 关闭 Markdown                | 进一步降级渲染策略                   |

---

## 8. 排期建议

| 阶段             | 预估          | 依赖            |
| ---------------- | ------------- | --------------- |
| S1 SDK 类型      | 0.5 天        | 无              |
| S2 Loop 透传     | 0.5 天        | S1              |
| S3 useAgentChat  | 1 天          | S1              |
| S4 agent-ui 框架 | 1.5 天        | S1              |
| S5 ai.tsx 接入   | 0.5 天        | S3、S4          |
| S6 文档验收      | 0.5 天        | 全部            |
| 合计             | **约 4.5 天** | 串行可压到 3 天 |

建议 S1/S2/S3 串行（SDK 内部强依赖），S4 可与 S3 并行。

---

## 9. 待你确认

1. 基线决策 5 项（第 1 节）是否认可？
2. 示例用 mock `WeatherCard`（不碰后端）是否同意？
3. 引入 `react-native-markdown-display` 是否 OK？
4. `textUpdateThrottleMs` 默认 40ms 是否接受？
5. 排期 4.5 天是否符合预期？

确认后我从 S1 开始编码。
