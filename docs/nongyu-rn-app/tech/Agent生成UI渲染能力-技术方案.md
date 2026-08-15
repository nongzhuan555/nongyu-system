# Agent 生成 UI 渲染能力 - 技术方案

| 项       | 内容                                                                             |
| -------- | -------------------------------------------------------------------------------- |
| 版本     | v0.1（待审核）                                                                   |
| 日期     | 2026-08-15                                                                       |
| 需求类型 | 基建（扩展 `nongyu-agent-sdk` 能力 + RN 端 Agent UI 渲染框架）                   |
| 关联     | `packages/nongyu-agent-sdk`、`apps/nongyu-rn-app`                                |
| 上游     | 调研结论：业内 Generative UI 以 Controlled 模式（工具调用 → 内联渲染）为生产默认 |
| 下游     | 后续业务卡片（二课活动、课表、成绩等）各自另开 Spec，复用本能力                  |

---

## 0. 阅读前提

本方案是 SDD 流程的「技术方案文档」步骤，回答 **HOW**：在自研 `nongyu-agent-sdk` 现有架构上，如何让 RN 端 Agent 聊天内联渲染 app 内真实 UI 组件。

WHAT（做什么、边界、验收）由后续 Spec 定义。本方案以「二课活动卡片」作为贯穿示例，仅用于说明机制，**不**承诺在本期实现二课活动业务本身。

---

## 1. 背景与目标

### 1.1 背景

当前 RN 端 `app/ai.tsx` 为占位页；`nongyu-agent-sdk` 已具备完整的工具调用链路（`ToolDefinition` → `AgentLoop` → `tool:call`/`tool:result` 流式事件 → `useAgentChat` 写入 `message.toolCalls`）。但 assistant 消息只能渲染纯文本/Markdown，无法把工具结果映射为 app 内真实组件。

业界（Vercel AI SDK、CopilotKit RN、json-render）已形成「Generative UI」共识：让 LLM **选组件 + 填数据**，由前端按预注册表渲染，而非让模型写 UI 代码。其中 **Controlled 模式**（工具调用 → 内联渲染）是生产默认。

### 1.2 目标

1. 在 `nongyu-agent-sdk` 上增加「工具结果可渲染」的声明与传递能力，**纯加法、不破坏现有 API**。
2. 在 RN 端提供 `agent-ui` 渲染框架：工具调用 → 按注册表内联渲染真实组件，支持 加载/成功/失败 三态与事件回流。
3. 端到端打通一个示例（二课活动卡片），证明机制可用。
4. 保持 SDK 平台无关（DOM/RN 通用），渲染实现各端各自注册。

### 1.3 非目标（本期不做）

- 不引入 Vercel AI SDK / CopilotKit / json-render 等外部框架（自研 SDK 已具备传输层）。
- 不做 Declarative 模式（LLM 编排布局的 JSON UI 树），仅做 Controlled。
- 不让 LLM 生成任何 JSX/HTML/CSS。
- 不在本期实现二课活动、课表等具体业务卡片（各业务另开 Spec）；本期只交付框架 + 一个示例卡片。
- 不改动 AgentLoop 的推理逻辑、上下文管理、模型适配层。

---

## 2. 技术选型

| 领域        | 选型                                                             | 说明                                                                              |
| ----------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 渲染范式    | **Controlled Generative UI**（工具调用 → 内联渲染）              | 业内生产默认；安全（组件预审）、可预测、类型安全；与现有 `toolCalls` 字段天然契合 |
| 组件注册    | **字符串名 → 组件** 的注册表（前端各端各自注册）                 | 保持 SDK 平台无关；`ToolDefinition.render.component` 只声明字符串，不携带组件实现 |
| Schema 校验 | 复用现有 **Zod** `inputSchema`                                   | 工具入参已强制 Zod 校验；渲染组件 props 由 `ToolRenderProps<Args,Out>` 约束       |
| 消息列表    | 复用 RN 选型 **FlashList**                                       | 长对话性能保障；`estimatedItemSize` 必填；每条消息 `React.memo`                   |
| Markdown    | 沿用 RN 端既有方案（若无可引入 `react-native-markdown-display`） | assistant 文本部分仍走 Markdown；工具渲染作为消息内的独立段                       |
| 事件回流    | 通过 `useAgentChat.append` 注入 user 消息触发下一轮              | 复用现有通道，不新增协议；卡片内交互转成语义消息交给 Agent 决策                   |
| 依赖增量    | **零新原生依赖**                                                 | 纯 JS/TS 改动，走 Pushy 热更，不碰原生壳                                          |

**不选外部框架的理由**：`nongyu-agent-sdk` 已有 `ToolDefinition` + `useAgentChat`（已在 `message.toolCalls` 捕获 `tool:call`/`tool:result`），与 CopilotKit `useRenderTool` / AI SDK `message.parts` 的 tool 段同构。迁移外部框架等于重写传输层，收益为零。仅需补「render 声明 + 前端注册表 + 内联渲染器」三层。

---

## 3. 现状与改动点定位

### 3.1 现状（已具备）

| 文件                                | 现状                                                                          | 与本需求关系                                           |
| ----------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| `src/types/tool.ts`                 | `ToolDefinition { name, description, inputSchema, execute, needsApproval? }`  | 需新增 `render?` 声明                                  |
| `src/types/agent.ts:68`             | `ToolCallRecord { toolName, input, output?, duration? }`                      | 需新增 `callId / status / error / renderComponent`     |
| `src/types/stream.ts`               | `tool:call { toolName, input }`、`tool:result { toolName, output, duration }` | 需新增 `callId`（模型层 `ToolCall.id` 已有，只需透传） |
| `src/types/model.ts:11`             | `ToolCall { id, type, function:{name, arguments} }`                           | `id` 已存在，是 `callId` 来源                          |
| `src/core/tool/registry.ts`         | `ToolRegistry` 仅管理工具                                                     | 需暴露 `renderComponent` 查询                          |
| `src/hooks/useAgentChat.ts:136/161` | `tool:call` push 记录；`tool:result` 按 `toolName && output===undefined` 回填 | 需改用 `callId` 回填；写入 `status/renderComponent`    |
| `src/hooks/types.ts:9`              | `ChatMessage { ..., toolCalls?: ToolCallRecord[] }`                           | 已具备，无需改结构，仅享受 `ToolCallRecord` 扩展       |
| `apps/nongyu-rn-app/app/ai.tsx`     | 占位页                                                                        | 需替换为真实聊天页（本期交付）                         |

### 3.2 改动点（全部为加法）

```
nongyu-agent-sdk (SDK 侧)
  ├─ types/tool.ts        ToolDefinition + render?, Tool + renderComponent?
  ├─ types/agent.ts       ToolCallRecord + callId/status/error/renderComponent
  ├─ types/stream.ts      tool:call / tool:result + callId
  ├─ core/tool/registry.ts 暴露 getRenderComponent(name)
  ├─ core/tool/index.ts   tool() 工厂透传 render
  ├─ core/agent/loop/*     产出流式块时带上 callId（来自模型 ToolCall.id）
  └─ hooks/useAgentChat.ts 按 callId 回填；写入 status/renderComponent

nongyu-rn-app (RN 侧)
  ├─ src/agent-ui/registry.ts        ToolRenderProps + 注册表
  ├─ src/agent-ui/ToolCallView.tsx   单个工具调用内联渲染
  ├─ src/agent-ui/AssistantMessage.tsx 文本 + 工具调用组合渲染
  ├─ src/agent-ui/MessageList.tsx    FlashList 消息列表
  ├─ src/agent-ui/register.ts        启动时注册各业务卡片（本期仅 ActivityCard 示例）
  ├─ src/components/agent/ActivityCard.tsx  示例卡片（真实复用活动卡片）
  └─ app/ai.tsx                      替换占位页为聊天页
```

---

## 4. 技术方案

### 4.1 核心数据流

```
用户输入
  → Agent.stream()
  → AgentLoop: 模型返回 tool_call(id, name, args)
  → 流出 tool:call { callId, toolName, input, renderComponent? }
  → useAgentChat: push ToolCallRecord(status='executing')
  → RN: AssistantMessage 渲染 → ToolCallView 查注册表 → 渲染骨架(因 output 未到)

  → AgentLoop: execute(input) → output
  → 流出 tool:result { callId, toolName, output, duration }
  → useAgentChat: 按 callId 回填 output，status='done'
  → RN: ToolCallView 重渲 → 渲染真实 ActivityCard(output.list)

  → (可选) 卡片内交互 → onAction → useAgentChat.append("报名 {活动名}")
  → 触发下一轮 Agent 决策
```

关键：用 **callId**（来自模型 `ToolCall.id`）而非 `toolName` 回填结果，解决一条 assistant 消息内并发同名工具调用错位问题（现有 `useAgentChat.ts:166` 按 `toolName && output===undefined` 匹配，并发会错位）。

### 4.2 SDK 侧改动

#### 4.2.1 `ToolDefinition` 增加渲染声明

```ts
// types/tool.ts
export interface ToolRenderSpec {
  /** 前端注册的组件名，由各端 ToolUIRegistry 解析 */
  component: string;
}

export interface ToolDefinition<TInput, TOutput> {
  name: string;
  description: string;
  inputSchema: TInput;
  execute: (input, context) => Promise<TOutput>;
  needsApproval?: boolean | ((input) => boolean);
  /** 声明该工具的结果用前端某组件内联渲染；不声明则按原行为（不渲染） */
  render?: ToolRenderSpec;
}

export interface Tool<TInput, TOutput> {
  // ...原有
  readonly renderComponent?: string;
}
```

`render.component` 用字符串而非组件，是为了让 SDK 保持 DOM/RN 通用——组件实现由各端注册表提供。

#### 4.2.2 `ToolCallRecord` 扩展

```ts
// types/agent.ts
export interface ToolCallRecord {
  callId: string; // 来自模型 ToolCall.id，唯一
  toolName: string;
  input: unknown;
  output?: unknown;
  duration?: number;
  status: "executing" | "done" | "error";
  error?: string;
  renderComponent?: string; // 透传自 ToolDefinition.render.component
}
```

#### 4.2.3 流式块带 callId

```ts
// types/stream.ts
| { type: 'tool:call'; callId: string; toolName: string; input: unknown; renderComponent?: string }
| { type: 'tool:result'; callId: string; toolName: string; output: unknown; duration: number }
| { type: 'tool:error'; callId: string; toolName: string; error: Error }   // 新增
```

`AgentLoop` 在解析模型 `ToolCall` 时把 `id` 透传到 `tool:call`/`tool:result`/`tool:error`。`renderComponent` 从 `ToolRegistry.get(toolName).renderComponent` 取。

#### 4.2.4 `useAgentChat` 改用 callId 回填

```ts
// tool:call
toolCalls.push({ callId, toolName, input, status: "executing", renderComponent });

// tool:result
toolCalls = toolCalls.map((tc) =>
  tc.callId === chunk.callId
    ? { ...tc, output: chunk.output, duration: chunk.duration, status: "done" }
    : tc,
);

// tool:error
toolCalls = toolCalls.map((tc) =>
  tc.callId === chunk.callId ? { ...tc, status: "error", error: chunk.error.message } : tc,
);
```

兼容性：旧字段 `toolName/output/duration` 保留，仅新增 `callId/status/error/renderComponent`，旧调用方不受影响（`callId` 缺失时降级为按 toolName 回填）。

### 4.3 RN 侧渲染层

#### 4.3.1 注册表与契约

```ts
// src/agent-ui/registry.ts
export interface ToolRenderProps<Args = any, Out = any> {
  callId: string;
  args: Args;
  output: Out | undefined; // executing 时 undefined
  status: "executing" | "done" | "error";
  error?: string;
  /** 事件回流：转成用户语义消息交给 Agent 决策 */
  onAction?: (text: string) => void;
}
export type ToolRenderer<P = any> = React.ComponentType<ToolRenderProps<P>>;

const renderers = new Map<string, ToolRenderer>();
export function registerToolUI(toolName: string, r: ToolRenderer) {
  renderers.set(toolName, r);
}
export function getToolUI(toolName: string) {
  return renderers.get(toolName);
}
```

#### 4.3.2 内联渲染

```tsx
// src/agent-ui/ToolCallView.tsx
const Renderer = getToolUI(tc.toolName);
if (!Renderer) return <ToolCallChip tc={tc} />; // 未注册 → 折叠 chip，不撑乱对话
return (
  <Renderer
    callId={tc.callId}
    args={tc.input}
    output={tc.output}
    status={tc.status}
    error={tc.error}
    onAction={onAction}
  />
);
```

#### 4.3.3 AssistantMessage 组合

```tsx
// src/agent-ui/AssistantMessage.tsx
<View>
  {message.content ? <Markdown>{message.content}</Markdown> : null}
  {(message.toolCalls ?? []).map((tc) => (
    <ToolCallView key={tc.callId} tc={tc} />
  ))}
</View>
```

#### 4.3.4 消息列表（FlashList）

- `estimatedItemSize` 必填；消息行 `React.memo`，key 用 `message.id`。
- 自动滚动走 `onContentSizeChange`，不在每个 token 上滚。
- 工具卡片单独 `React.memo`，仅 `output/status` 变化才重渲。

### 4.4 事件回流协议

卡片内交互（如「报名活动 #3」）**不直接改全局状态**，统一转成语义用户消息：

```ts
onAction?.(`报名活动：${activity.title}`); // → useAgentChat.append
```

理由：保持「Agent 是唯一副作用入口」，由 Agent 决定是否调用真正的报名工具（该工具可带 `needsApproval`）。这与现有 `needsApproval` 审批机制一致，避免卡片绕过 Agent 私自执行副作用。

### 4.5 示例：二课活动卡片（端到端）

工具定义（SDK 侧，仅声明）：

```ts
export const querySecondClassActivities = tool({
  name: "query_second_class_activities",
  description: "查询当前可报名的第二课堂活动，结果以活动卡片形式展示",
  inputSchema: z.object({
    keyword: z.string().optional().describe("关键词筛选"),
    category: z.string().optional().describe("活动分类"),
  }),
  render: { component: "ActivityCard" },
  async execute({ keyword, category }, ctx) {
    return await fetchActivities({ keyword, category }, ctx.abortSignal); // { list: Activity[] }
  },
});
```

RN 端注册（启动时一次）：

```ts
registerToolUI("query_second_class_activities", ActivityCard);
```

`ActivityCard` 复用 app 内真实活动卡片组件，仅包一层 `ToolRenderProps` 适配：

```tsx
function ActivityCard({ args, output, status }: ToolRenderProps) {
  if (status === "executing" || !output) return <ActivityCardSkeleton />;
  const list = output.list ?? [];
  if (!list.length) return <EmptyHint keyword={args.keyword} />;
  return (
    <FlashList
      data={list.slice(0, 5)}
      renderItem={({ item }) => <ActivityItem activity={item} />}
      estimatedItemSize={120}
      horizontal
    /> // 对话内横向轮播，避免长列表撑爆
  );
}
```

> 说明：本期只交付此示例卡片以验证机制；二课活动**业务**（接口、数据模型、完整列表页）另开 Spec，不在本方案范围。

---

## 5. 实现步骤

| 阶段                 | 内容                                                                           | 产出           | 验证                                              |
| -------------------- | ------------------------------------------------------------------------------ | -------------- | ------------------------------------------------- |
| S1 SDK 类型扩展      | `tool.ts`/`agent.ts`/`stream.ts` 加字段；`registry.ts` 暴露 `renderComponent`  | 类型与注册表   | `pnpm --filter nongyu-agent-sdk type-check`       |
| S2 SDK Loop 透传     | `AgentLoop` 产出 `tool:call/result/error` 时带 `callId`、`renderComponent`     | 流式块字段齐全 | 单测：mock 模型返回多 tool_call，断言 callId 透传 |
| S3 useAgentChat 改造 | 按 `callId` 回填；写入 `status/renderComponent`；处理 `tool:error`             | hook 行为      | 单测：并发同名工具回填不错位                      |
| S4 RN agent-ui 框架  | `registry/ToolCallView/AssistantMessage/MessageList`                           | 渲染组件       | 手动联调：占位工具能渲染三态                      |
| S5 示例卡片打通      | `ActivityCard` 示例 + `query_second_class_activities` 工具 + `app/ai.tsx` 接入 | 端到端         | 真机：问「二课活动」→ 卡片内联出现                |
| S6 文档与示例        | 更新 `TECH-DESIGN.md` 增「生成 UI」小节；补 README 示例                        | 文档           | 评审                                              |

---

## 6. 注意事项

### 6.1 性能

- FlashList `estimatedItemSize` 必填，否则滚动跳跃；消息行 + 卡片均 `React.memo`。
- 对话内嵌列表用横向轮播或截断（前 5 +「查看更多」跳页），避免长列表撑爆内存。
- `abortSignal` 必须透传到工具 `execute`（`ToolContext.abortSignal` 已具备），用户停止时能中断 fetch。
- 不在 `onChangeText` 滚动，按 `onContentSizeChange` 滚动（RN 流式聊天通用经验）。

### 6.2 安全

- 组件**全部开发者预审**，模型不写任何 UI 代码 → 天然无 XSS。
- 输入经 Zod 校验（已有 `inputSchema`）。
- 敏感动作（报名/删除）用 `needsApproval`（已有），前端弹确认；卡片内交互仅回流语义消息，不直接执行副作用。
- 未注册 render 的工具：折叠为 chip 或静默不渲染，避免对话被未知工具撑乱。

### 6.3 兼容性

- 所有 SDK 改动为加法：`render?`、`callId`、`status`、`error`、`renderComponent` 均可选。
- `callId` 缺失时 `useAgentChat` 降级为按 `toolName && output===undefined` 回填（保留旧行为）。
- 不改 `AgentLoop` 推理逻辑、上下文管理、模型适配层。

### 6.4 双端一致性

- SDK 只声明 `render.component` 字符串，组件实现各端各自注册，保持 DOM/RN 通用。
- 未来 Web 端（nongyu-web-admin）可复用同一套工具定义，仅注册表不同。

### 6.5 热更新（Pushy）

- 纯 JS/TS 改动，零新原生依赖，走热更即可，不碰原生壳。

---

## 7. 风险与对策

| 风险                     | 说明                                        | 对策                                                                 |
| ------------------------ | ------------------------------------------- | -------------------------------------------------------------------- |
| 一条消息多个同名工具并发 | 现有按 `toolName` 回填会错位                | 引入 `callId`，按 id 回填（本方案已含）                              |
| LLM 幻觉调用未注册工具   | 模型可能调不存在或未注册 render 的 toolName | 渲染端 fallback chip；system prompt 只声明已注册工具                 |
| 卡片内长列表撑爆对话     | 二课活动可能很多                            | 横向 FlashList 或截断 +「查看全部」跳页                              |
| 工具 execute 失败        | 整条 assistant 消息不应崩                   | `status:'error'`，卡片渲染失败态，不影响文本段                       |
| 事件回流死循环           | 卡片 onAction → append → Agent 又调同工具   | 复用现有 `maxSteps`/`stopWhen`；卡片 onAction 仅在用户显式交互时触发 |

---

## 8. 待确认事项（需用户拍板）

1. **需求归类确认**：本方案归「基建」（扩展 SDK + RN 渲染框架），是否符合你的划分？
2. **Spec 是否先行**：按 SDD 应先写 Spec（WHAT/边界/验收）再写技术方案；本方案是技术方案，是否需要我补一份 Spec 供你先审？
3. **示例卡片范围**：本期示例用「二课活动卡片」是否合适？还是改用更轻的占位示例（如「天气卡片」mock 数据），把真实业务卡片留到二课 Spec？
4. **Markdown 选型**：RN 端当前是否有既定 Markdown 渲染方案？若无，是否允许引入 `react-native-markdown-display`？
5. **`callId` 兼容降级**：是否保留「callId 缺失时按 toolName 回填」的降级逻辑，还是强制 callId 必填（更干净但破坏旧调用方）？

---

## 9. 参考来源

| 来源                                                   | 相关要点                                         |
| ------------------------------------------------------ | ------------------------------------------------ |
| Vercel AI SDK 5/6 `message.parts` 的 `tool-${name}` 段 | 工具调用 → 内联渲染组件                          |
| CopilotKit RN `useRenderTool`                          | RN 端工具渲染注册表、`status` 三态               |
| Vercel Labs `json-render`（2026 开源）                 | Declarative 模式参考（本期不采用）               |
| AI/TLDR《Generative UI Patterns》                      | Controlled/Declarative/Open-ended 谱系、安全原则 |
| CopilotKit《Generative UI Spectrum》                   | 谱系划分与生产默认选择                           |
