# nongyu-agent-sdk 技术设计文档

> 版本: v1.0 | 最后更新: 2026-06-14

***

## 目录

1. [设计目标](#1-设计目标)
2. [核心架构概览](#2-核心架构概览)
3. [Agent 系统](#3-agent-系统)
4. [工具系统](#4-工具系统)
5. [上下文管理器](#5-上下文管理器)
6. [事件总线](#6-事件总线)
7. [流式传输协议](#7-流式传输协议)
8. [Channel 通道系统](#8-channel-通道系统)
9. [客户端 SDK](#9-客户端-sdk)
10. [Agent 运行循环](#10-agent-运行循环)
11. [可观测性](#11-可观测性)
12. [目录结构规划](#12-目录结构规划)
13. [对外 API 设计](#13-对外-api-设计)
14. [实施路线图](#14-实施路线图)

***

## 1. 设计目标

### 1.1 运行环境

| 环境               | 说明                                                         |
| ---------------- | ---------------------------------------------------------- |
| **浏览器**          | 作为 Web 应用（nongyu-web-admin / nongyu-agent-gui）的内嵌 SDK      |
| **React Native** | 作为移动端（nongyu-rn-app）的内嵌 SDK                                |
| **Node.js**      | 作为服务端（nongyu-node-server）或 CLI 工具（nongyu-agent-cli）的后端 SDK |

纯 TypeScript 编写，无 DOM 依赖，通过适配器模式屏蔽平台差异（网络请求、持久化存储等）。

### 1.2 使用方式

采用**双层 API 设计**，参考 Vercel AI SDK：

- **高层封装**：提供类似 `useAgent` / `useChat` 的 React Hook，一行代码接入，屏蔽内部复杂性
- **底层原语**：核心组件（Agent、Tool、ContextManager、EventBus、Channel）全部对外导出，用户可自由组装自定义流程

```ts
// 高层 - 极简使用
const { messages, send, status } = useAgent({
  agent: 'jiaowu-assistant',
});

// 底层 - 自定义组装
const agent = createAgent({
  name: 'custom',
  systemPrompt: '你是一个...',
  tools: { toolA, toolB },
});
// 也支持后续动态追加工具
agent.use(toolC);
agent.on('step:start', (ctx) => { /* ... */ });
const stream = agent.stream({ prompt: '...' });
```

### 1.3 核心设计原则

- **组合优于继承**：Agent = Prompt + Tools，通过组合构造能力
- **类型安全优先**：全链路 TypeScript + Zod 校验，从工具定义到 UI 展示类型一致
- **事件驱动**：Agent 内部通过事件总线解耦，外部可订阅任意生命周期事件
- **跨平台无锁**：仅在主线程运行，不引入 Web Worker / 多线程复杂性

***

## 2. 核心架构概览

```
┌──────────────────────────────────────────────────────┐
│                    用户代码层                          │
│  ┌─────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │ useAgent │  │ useAgent │  │ Agent (直接调用)    │  │
│  │ (React)  │  │  (Vue)   │  │                    │  │
│  └────┬─────┘  └────┬─────┘  └────────┬───────────┘  │
│       │              │                │               │
├───────┴──────────────┴────────────────┴───────────────┤
│                  AgentClient (客户端)                  │
│  - 管理连接生命周期                                     │
│  - SSE 流解析 & 消息去重                                │
│  - 客户端状态同步                                       │
├──────────────────────────────────────────────────────┤
│                    核心层 (core)                       │
│  ┌────────┐  ┌──────┐  ┌─────────┐  ┌───────────┐  │
│  │  Agent │  │ Tool │  │ Context │  │ EventBus  │  │
│  │ System │  │System│  │ Manager │  │  (mitt)   │  │
│  └───┬────┘  └──┬───┘  └────┬────┘  └─────┬─────┘  │
│      │          │            │              │        │
│  ┌───┴──────────┴────────────┴──────────────┴─────┐  │
│  │              AgentLoop (运行引擎)               │  │
│  │  - prepareStep → LLM call → parse → execute    │  │
│  │  - stopWhen 策略控制                            │  │
│  │  - 子 Agent 调度 (as Tool / Handoff)           │  │
│  └────────────────────┬───────────────────────────┘  │
│                       │                               │
│  ┌────────────────────┴───────────────────────────┐  │
│  │          ModelProvider (模型适配器)              │  │
│  │  - OpenAI 风格兼容                                 │  │
│  │  - 统一 generateText / streamText 接口          │  │
│  └────────────────────┬───────────────────────────┘  │
│                       │                               │
│  ┌────────────────────┴───────────────────────────┐  │
│  │          Channel / Gateway (通道层)              │  │
│  │  - 多通道注册 & 消息路由                         │  │
│  │  - 入站 / 出站消息标准化                          │  │
│  └────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────┤
│                   平台适配层                           │
│  ┌────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  Browser    │  │  React Native │  │  Node.js   │  │
│  │  Adapter    │  │   Adapter     │  │  Adapter   │  │
│  └────────────┘  └──────────────┘  └────────────┘  │
└──────────────────────────────────────────────────────┘
```

**数据流**：

```
User Input → Channel → Gateway → AgentLoop
  → prepareStep (裁剪/摘要上下文)
  → ModelProvider.generateText/streamText (带 tools + systemPrompt)
  → parse response (text / tool_call / handoff)
  → execute tool / switch to sub-agent
  → emit events (step:start, text:delta, tool:call, step:end, ...)
  → Gateway → Channel → UI
```

***

## 3. Agent 系统

### 3.1 核心理念：Prompt + Tools = Agent

参考 OpenAI Agents SDK 和 Vercel AI SDK 的最佳实践，每个 Agent 由三个核心要素构成：

| 要素               | 说明                                   |
| ---------------- | ------------------------------------ |
| **Model**        | 驱动推理和决策的大语言模型                        |
| **systemPrompt** | 系统提示词，定义 Agent 的角色、行为方式和约束规则，创建后不可更改 |
| **Tools**        | Agent 可调用的外部能力（函数 / 子 Agent ）        |

> 使用系统提示词定义 Agent 的角色和做事方式，再匹配相应的工具，就构成了一个具备特定领域能力的 Agent。

### 3.2 多 Agent 架构

本 SDK 采用**主 Agent + 子 Agent 作为工具（Agent-as-Tool）** 的编排模式，参考 OpenAI Agents SDK 的 `agent.asTool()` 设计：

```
┌─────────────────┐
│   主 Agent       │  ← 直接面向用户，负责理解意图和协调调度
│  (Main Agent)    │
└────────┬────────┘
         │ 调用 (as Tool)
    ┌────┴────┬────────────┐
    ▼         ▼            ▼
┌───────┐ ┌───────┐  ┌───────────┐
│ 教务   │ │ 二课   │  │  通用知识  │
│ Agent │ │ Agent │  │   Agent   │
└───────┘ └───────┘  └───────────┘
```

**子 Agent 编排模式**：

| 模式                | 场景                                   | 实现方式                         |
| ----------------- | ------------------------------------ | ---------------------------- |
| **Agent-as-Tool** | 主 Agent 保持对话主导权，子 Agent 完成独立子任务后返回结果 | 子 Agent 包装为 Tool，被主 Agent 调用 |

### 3.3 Agent 定义

```ts
interface AgentConfig {
  /** 全局唯一标识，对应工具系统的 name */
  name: string;

  /** 功能描述，用于主 Agent 判断何时调用该子 Agent */
  description: string;

  /** 系统提示词，定义 Agent 角色与行为方式，创建后不可更改 */
  systemPrompt: string;

  /** 工具集 */
  tools?: Record<string, Tool>;

  /** 子 Agent 列表（将自动包装为 Tool） */
  subAgents?: Agent[];

  /** 使用的模型，默认继承主 Agent 或全局默认 */
  model?: ModelProvider;

  /** 上下文配置 */
  context?: ContextConfig;

  /** 运行控制 */
  runConfig?: RunConfig;
}

interface RunConfig {
  /** 最大执行步数，防止无限循环，默认 20 */
  maxSteps?: number;

  /** 自定义停止条件 */
  stopWhen?: (context: StepContext) => boolean | Promise<boolean>;

  /** 每步执行前的钩子，可用于动态选择模型或注入额外上下文 */
  prepareStep?: (context: StepContext) => Promise<StepContext>;

  /** 工具调用是否需要用户审批 */
  toolApproval?: ToolApprovalConfig;

  /** 温度参数 */
  temperature?: number;
}
```

### 3.4 Agent 状态机

Agent 在运行过程中维护明确的状态，主要用于 UI 展示和外部监控：

```
         ┌──────────┐
         │   idle   │ ← 初始状态 / 运行结束
         └────┬─────┘
              │ send(prompt)
              ▼
         ┌──────────┐
         │ thinking │ ← 正在调用 LLM 进行推理
         └────┬─────┘
              │ 模型返回
         ┌────┴────┬──────────┐
         ▼         ▼          ▼
    ┌─────────┐ ┌──────┐ ┌──────────┐
    │streaming│ │tool  │ │completed │ ← 正常结束
    │(流式文本)│ │calling│ │          │
    └────┬────┘ └──┬───┘ └──────────┘
         │         │ 工具执行完
         │         ▼
         │    ┌──────────┐
         │    │thinking  │ ← 返回循环
         │    └──────────┘
         │
    ┌────┴────┐
    │ stopped │ ← 主动停止
    └─────────┘
    ┌─────────┐
    │  error  │ ← 异常终止
    └─────────┘
```

```ts
type AgentStatus =
  | 'idle'
  | 'thinking' // 用于表示complete完整响应的中间状态
  | 'streaming' // 用于表示stream流式响应的中间状态
  | 'tool-calling'
  | 'completed'
  | 'stopped'
  | 'error';

interface AgentState {
  status: AgentStatus;
  currentStep: number;
  totalTokens: number;
  messages: Message[];
  error?: Error;
}
```

### 3.5 Agent 核心方法

```ts
interface Agent {
  /** 获取 Agent 名称 */
  readonly name: string;

  /** 获取当前状态（响应式） */
  readonly state: Readonly<AgentState>;

  /** 完整回复 - 等待全部生成后返回 */
  complete(input: AgentInput): Promise<AgentOutput>;

  /** 流式回复 - 返回 AsyncIterable，支持逐 token 推送 */
  stream(input: AgentInput): AsyncIterable<AgentStreamChunk>;

  /** 停止当前正在进行的回复 */
  stop(): void;

  /** 注册工具 */
  use(tool: Tool): this;

  /** 注册子 Agent（包装为 Tool） */
  useSubAgent(agent: Agent): this;

  /** 事件订阅 */
  on<E extends AgentEvent>(event: E, handler: AgentEventHandler<E>): void;

  /** 事件取消订阅 */
  off<E extends AgentEvent>(event: E, handler: AgentEventHandler<E>): void;
}
```

### 3.6 工厂函数

```ts
import { createAgent, createSubAgent } from 'nongyu-agent-sdk';

// 创建主 Agent
const mainAgent = createAgent({
  name: 'nongyu-assistant',
  description: '农屿智能助手，负责理解用户意图并协调子模块完成任务',
  systemPrompt: `你是农屿系统的智能助手...
  你有以下子模块可以调用：
  - jiaowu-agent: 处理教务相关问题
  - second-agent: 处理二课相关问题`,
  tools: { calculator: calculatorTool },
  subAgents: [jiaowuAgent, secondAgent],
  runConfig: {
    maxSteps: 20,
  }
});

// 创建子 Agent（语法完全相同）
const jiaowuAgent = createAgent({
  name: 'jiaowu-agent',
  description: '处理川农教务相关的问题，包括课程查询、成绩查询、课表管理等',
  systemPrompt: '你是川农教务助手...',
  tools: { /* 教务工具 */ },
});
```

***

## 4. 工具系统

### 4.1 工具定义

参考 Vercel AI SDK 6 的 `tool()` 工厂函数：

```ts
import { z } from 'zod/v4'; // Zod v4 原生支持 JSON Schema 互转

interface ToolDefinition<TInput extends z.ZodTypeAny, TOutput> {
  /** 工具描述，用于 LLM 理解何时调用 */
  description: string;

  /** 输入参数 Schema（Zod → JSON Schema 自动转换） */
  inputSchema: TInput;

  /** 执行函数 */
  execute: (input: z.infer<TInput>, context: ToolContext) => Promise<TOutput>;

  /** 是否需要用户审批 */
  needsApproval?: boolean | ((input: z.infer<TInput>) => boolean);
}

function tool<TInput extends z.ZodTypeAny, TOutput>(
  def: ToolDefinition<TInput, TOutput>
): Tool;
```

### 4.2 使用示例

```ts
const courseQueryTool = tool({
  description: '查询课程信息，支持按课程名称、教师名称、课程编号搜索',
  inputSchema: z.object({
    keyword: z.string().describe('搜索关键词'),
    semester: z.string().optional().describe('学期，格式: 2025-2026-1'),
  }),
  async execute({ keyword, semester }, ctx) {
    // ctx 提供 abortSignal、emit 等上下文能力
    ctx.emit('tool:progress', { message: `正在查询 "${keyword}"...` });
    const result = await jiaowuApi.queryCourses(keyword, semester);
    return result;
  },
});

// 注册到 Agent
agent.use(courseQueryTool);
```

### 4.3 JSON Schema 生成

Zod v4 原生支持 `z.toJSONSchema()`：

```ts
import { zodToJsonSchema } from 'zod/v4';

const schema = courseQueryTool.inputSchema; // Zod schema
const jsonSchema = zodToJsonSchema(schema);
// → 直接嵌入 systemPrompt 发给 LLM
```

### 4.4 Agent-as-Tool 自动封装

当子 Agent 注册到主 Agent 时，自动生成标准 Tool：

```ts
// 内部实现示意
function agentAsTool(agent: Agent): Tool {
  return tool({
    description: agent.description,
    inputSchema: z.object({
      query: z.string().describe(`传递给 ${agent.name} 的任务描述`),
    }),
    async execute({ query }, ctx) {
      // 子 Agent 独立运行，完成后返回结果
      const result = await agent.complete({ prompt: query, context: ctx });
      return result.content;
    },
  });
}
```

### 4.5 工具执行审批

支持在工具定义中标记 `needsApproval`，当工具被 LLM 调用时暂停流程，等待用户确认：

```ts
const deleteCourseTool = tool({
  description: '删除指定课程',
  inputSchema: z.object({ courseId: z.string() }),
  needsApproval: true, // 始终需要审批
  // 或按输入动态判断:
  // needsApproval: (input) => input.courseId.startsWith('CRITICAL'),
  async execute({ courseId }) {
    return await jiaowuApi.deleteCourse(courseId);
  },
});
```

***

## 5. 上下文管理器

### 5.1 设计原理

参考 OpenAI Agents SDK 的 Session Memory 和 Anthropic 的上下文工程最佳实践，上下文管理器负责在有限的 Token 预算内，最大化信息密度。

核心矛盾：**LLM 上下文窗口有限，但多轮对话 + 工具调用结果会持续膨胀**。

### 5.2 上下文结构

```ts
interface AgentContext {
  /** 系统消息（systemPrompt，始终保留） */
  system: SystemMessage;

  /** 消息历史 */
  messages: Message[];

  /** 当前会话元信息 */
  metadata: {
    sessionId: string;
    agentName: string;
    turnCount: number;
    totalTokensUsed: number;
  };

  /** 摘要缓存（可选，用于长对话压缩） */
  summary?: string;
}

interface ContextConfig {
  /** 最大 Token 数，默认 8000 */
  maxTokens: number;

  /** 上下文管理策略 */
  strategy: ContextStrategy;

  /** 保留最近 N 轮完整对话（裁剪时），默认 6 */
  keepLastNTurns: number;

  /** 当 Token 超过此比例时触发压缩，默认 0.8 (80%) */
  compactThreshold: number;
}
```

### 5.3 上下文管理策略

#### 策略 1：裁剪 (Trimming) —— 推荐默认策略

```ts
/**
 * 保留最近 N 轮完整对话 + 系统消息 + 摘要头
 * 最早的消息被丢弃，如果配置了摘要则先对丢弃部分生成摘要
 *
 * 流程:
 * 1. 统计当前 Token 数
 * 2. 若超过 maxTokens * compactThreshold，触发裁剪
 * 3. 保留: system + summary + 最近 keepLastNTurns 轮完整消息
 * 4. 丢弃: 其余旧消息
 *
 * 优点：确定性、零额外延迟、易于调试
 * 缺点：可能丢失早期的关键约束信息
 */
interface TrimmingStrategy {
  type: 'trimming';
  keepLastNTurns: number;
  /** 是否在裁剪前先生成摘要（需要额外 LLM 调用） */
  summarizeBeforeTrim?: boolean;
}
```

#### 策略 2：摘要压缩 (Summarization)

```ts
/**
 * 当上下文接近 Token 上限时，调用一个轻量模型对历史消息做摘要
 * 将摘要插入 messages 头部，原始历史被替换
 *
 * 流程:
 * 1. 检测到 Token 数接近阈值
 * 2. 调用摘要模型（更小更快的模型）对旧消息生成摘要
 * 3. 将摘要插入为 system 级别的上下文消息
 *
 * 优点：保留语义信息，不丢失关键上下文
 * 缺点：额外的 LLM 调用延迟
 */
interface SummarizationStrategy {
  type: 'summarization';
  /** 用于生成摘要的模型（通常用小模型节省成本） */
  summaryModel?: ModelProvider;
  /** 当 Token 使用率达到此值时触发摘要（0-1），默认 0.8 */
  compactThreshold: number;
}
```

#### 策略 3：混合策略 (Hybrid)

```ts
/**
 * 综合裁剪 + 摘要，平衡性能和语义保留：
 * - 最近 keepLastNTurns 保留原文
 * - 被裁剪掉的部分生成摘要挂在前面
 */
interface HybridStrategy {
  type: 'hybrid';
  keepLastNTurns: number;
  summaryModel?: ModelProvider;
  compactThreshold: number;
}
```

### 5.4 上下文管理器实现接口

```ts
interface ContextManager {
  /** 添加消息到上下文 */
  addMessage(message: Message): void;

  /** 获取当前有效上下文（自动执行压缩策略） */
  getContext(): Promise<AgentContext>;

  /** 获取当前 Token 统计 */
  getTokenStats(): TokenStats;

  /** 手动触发上下文压缩 */
  compact(): Promise<void>;

  /** 清空上下文（保留系统消息） */
  clear(): void;

  /** 获取会话摘要（如果有） */
  getSummary(): string | undefined;
}

interface TokenStats {
  /** 累计输入 Token 数（来自模型 usage.prompt_tokens 累计） */
  totalInput: number;
  /** 累计输出 Token 数（来自模型 usage.completion_tokens 累计） */
  totalOutput: number;
  /** 上一次调用的 prompt Tokens */
  lastPromptTokens: number;
  /** 上次模型返回的 usage 原始信息 */
  lastUsage?: ModelUsage;
  /** 上下文上限，默认 8000 */
  limit: number;
  /** 输入估算使用率（基于 lastPromptTokens / limit） */
  usagePercent: number;
}
```

### 5.5 Token 统计

本 SDK **不自带 Tokenizer**，Token 统计完全依赖 LLM 每次响应中返回的 `usage` 信息：

```
Model Response:
{
  "choices": [...],
  "usage": {
    "prompt_tokens": 450,       // ← 本次请求实际消耗的输入 Token
    "completion_tokens": 120,   // ← 本次生成的输出 Token
    "total_tokens": 570
  }
}
```

- 每次 LLM 调用完成（`step:complete` 事件）后，从 `usage.prompt_tokens` 获取本次实际输入的 Token 数
- `TokenStats` 累积记录 `prompt_tokens` 和 `completion_tokens`
- 上下文压缩的触发基于最近的 `prompt_tokens` 是否接近 `limit * compactThreshold`
- 本方案完全消除了对 tokenizer 的依赖，且比估算精确，因为使用的是模型实际计数的结果

***

## 6. 事件总线

### 6.1 设计原则

- 基于 `mitt` 库（已在 package.json 中依赖）构建类型安全的事件系统
- 每个 Agent 实例维护独立的 EventBus 实例
- 事件分为 **Agent 生命周期事件** 和 **工具执行事件** 两大类

### 6.2 事件类型定义

```ts
type AgentEventMap = {
  // ===== Agent 生命周期事件 =====

  /** Agent 开始执行 */
  'agent:start': { agentName: string; input: AgentInput };

  /** 单个 Step 开始 */
  'step:start': { agentName: string; stepNumber: number; messages: Message[] };

  /** LLM 调用完成（返回文本或工具调用） */
  'step:complete': {
    agentName: string;
    stepNumber: number;
    type: 'text' | 'tool_call';
    tokensUsed: number;
  };

  /** 流式文本增量（仅 streaming 模式） */
  'text:delta': { agentName: string; delta: string; fullText: string };

  /** 文本生成完成 */
  'text:complete': { agentName: string; text: string };

  // ===== 工具事件 =====

  /** 工具被 LLM 调用 */
  'tool:call': { agentName: string; toolName: string; input: unknown };

  /** 工具执行完成 */
  'tool:result': { agentName: string; toolName: string; output: unknown; duration: number };

  /** 工具执行出错 */
  'tool:error': { agentName: string; toolName: string; error: Error };

  /** 工具需要用户审批 */
  'tool:approval-required': { agentName: string; toolName: string; input: unknown };

  // ===== 上下文事件 =====

  /** 上下文压缩触发 */
  'context:compact': { agentName: string; beforeTokens: number; afterTokens: number };

  // ===== 终止事件 =====

  /** Agent 正常完成 */
  'agent:complete': {
    agentName: string;
    output: AgentOutput;
    totalSteps: number;
    totalTokens: number;
  };

  /** Agent 被停止 */
  'agent:stop': { agentName: string; stepNumber: number };

  /** Agent 出错 */
  'agent:error': { agentName: string; error: Error; stepNumber: number };

  // ===== 状态变更 =====
  'state:change': { agentName: string; state: AgentState };
};
```

### 6.3 使用示例

```ts
// 订阅单个 Agent 事件
agent.on('step:start', ({ stepNumber }) => {
  console.log(`Step ${stepNumber} 开始`);
});

agent.on('text:delta', ({ delta }) => {
  // 实时渲染到 UI
  appendToChat(delta);
});

agent.on('tool:approval-required', async ({ toolName, input }) => {
  // 弹出确认框等待用户确认
  const approved = await showConfirmDialog(toolName, input);
  return { approved };
});

agent.on('agent:error', ({ error }) => {
  showErrorToast(error.message);
});
```

***

## 7. 流式传输协议

### 7.1 协议选型：SSE (Server-Sent Events)

参考 Vercel AI SDK 5/6 的设计，采用标准 SSE 作为流式传输协议：

- **原生浏览器支持**：`EventSource` API 或 `fetch` + `ReadableStream`
- **易于调试**：纯文本协议，可在 DevTools Network 面板直接查看
- **自动重连**：SSE 原生支持断线重连
- **跨平台**：Node.js / RN 均可实现 SSE 客户端

### 7.2 流式消息格式

```
event: text:delta
data: {"delta":"你好","fullText":"你好"}

event: tool:call
data: {"toolName":"course_query","input":{"keyword":"高等数学"}}

event: tool:result
data: {"toolName":"course_query","output":{...},"duration":320}

event: step:complete
data: {"stepNumber":1,"tokensUsed":450}

event: agent:complete
data: {"totalSteps":3,"totalTokens":1200}

event: agent:error
data: {"error":{"message":"模型返回超时"}}
```

### 7.3 流式实现

```ts
// Agent 端
async function* streamAgent(agent: Agent, input: AgentInput): AsyncIterable<StreamChunk> {
  let stopRequested = false;

  agent.on('agent:stop', () => { stopRequested = true; });

  for await (const step of executeAgentLoop(agent, input)) {
    if (stopRequested) break;

    if (step.type === 'text-delta') {
      yield { event: 'text:delta', data: { delta: step.delta, fullText: step.fullText } };
    } else if (step.type === 'tool-call') {
      yield { event: 'tool:call', data: { toolName: step.toolName, input: step.input } };
    }
    // ... 其他事件
  }
}

// 转换为 SSE 响应（Node.js HTTP）
function toSSEResponse(stream: AsyncIterable<StreamChunk>): Response {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        controller.enqueue(
          encoder.encode(`event: ${chunk.event}\ndata: ${JSON.stringify(chunk.data)}\n\n`)
        );
      }
      controller.close();
    },
  });
  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}
```

### 7.4 客户端 SSE 解析

```ts
class SSEClient {
  async *connect(url: string): AsyncIterable<StreamChunk> {
    const response = await fetch(url);
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // 解析 SSE 事件
      const events = this.parseSSEBuffer(buffer);
      buffer = events.remainder;
      for (const event of events.parsed) {
        yield event;
      }
    }
  }
}
```

***

## 8. Channel 通道系统

### 8.1 设计定位

Channel 负责 **消息的输入/输出传输**，与 Agent 核心逻辑解耦：

- Agent 不关心消息来源（HTTP / WebSocket / 终端 stdin / 消息队列）
- Channel 负责接收用户输入 → 交给 Agent 处理 → 把 Agent 输出发回用户
- 支持同时运行多个 Channel（如同时对接 QQ 机器人和 Web 界面）

### 8.2 Channel 接口

```ts
interface ChannelPlugin {
  meta: {
    id: string;
    name: string;
    type: 'http' | 'websocket' | 'stdio' | 'sse' | 'custom';
    version: string;
  };

  /** 启动通道 */
  start(): Promise<void>;

  /** 停止通道 */
  stop(): Promise<void>;

  /** 注册消息接收回调 */
  onMessage(handler: (envelope: InboundEnvelope) => Promise<void>): void;

  /** 发送出站消息 */
  send(envelope: OutboundEnvelope): Promise<void>;
}

interface InboundEnvelope {
  channel: string;        // 通道 ID
  conversationId: string; // 会话 ID（通道内唯一）
  from: { name: string; id?: string };
  text: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface OutboundEnvelope {
  conversationId: string; // 格式: "channelId:sessionId"
  text: string;
  metadata?: Record<string, unknown>;
}
```

### 8.3 Gateway 网关

Gateway 负责多通道的统一管理和消息路由：

```ts
class Gateway {
  /** 注册通道 */
  registerChannel(channel: ChannelPlugin): void;

  /** 启动所有通道 */
  start(): Promise<void>;

  /** 停止所有通道 */
  stop(): Promise<void>;

  /** 注册消息处理器（对接 Agent） */
  onMessage(handler: (envelope: InboundEnvelope) => Promise<OutboundEnvelope>): void;

  /** 发送消息到指定通道 */
  send(envelope: OutboundEnvelope): Promise<void>;

  /** 获取已注册的通道列表 */
  getChannels(): ChannelPlugin[];
}
```

### 8.4 使用示例

```ts
import { Gateway } from 'nongyu-agent-sdk/channel';

const gateway = new Gateway();
gateway.registerChannel(httpChannel);     // HTTP API
gateway.registerChannel(websocketChannel); // WebSocket

// 对接 Agent
gateway.onMessage(async (envelope) => {
  const result = await agent.complete({ prompt: envelope.text });
  return {
    conversationId: envelope.conversationId,
    text: result.content,
  };
});

await gateway.start();
```

***

## 9. 客户端 SDK

### 9.1 `AgentClient`

客户端 SDK 提供与远端 Agent 服务通信的能力：

```ts
interface AgentClientConfig {
  /** Agent 服务端点 */
  baseUrl: string;

  /** 请求头 */
  headers?: Record<string, string>;

  /** 重连配置 */
  reconnect?: {
    maxRetries: number;
    delayMs: number;
  };
}

class AgentClient {
  constructor(config: AgentClientConfig);

  /** 流式对话 */
  chat(input: AgentInput): AsyncIterable<StreamChunk>;

  /** 发送消息并等待完整回复 */
  send(input: AgentInput): Promise<AgentOutput>;

  /** 停止当前生成 */
  stop(): void;

  /** 获取连接状态 */
  get status(): 'connecting' | 'connected' | 'disconnected' | 'error';
}
```

### 9.2 React Hook

```ts
import { useAgent } from 'nongyu-agent-sdk/react';

function ChatPanel() {
  const {
    messages,
    status,
    send,
    stop,
    error,
  } = useAgent({
    agent: 'nongyu-assistant',
    // 或使用远程 Agent 客户端:
    // client: new AgentClient({ baseUrl: '/api/agent' }),
  });

  return (
    <div>
      {messages.map(msg => <MessageBubble key={msg.id} {...msg} />)}
      {status === 'streaming' && <ThinkingIndicator />}
      <ChatInput onSend={send} onStop={stop} disabled={status === 'thinking'} />
      {error && <ErrorBanner error={error} />}
    </div>
  );
}
```

***

## 10. Agent 运行循环

### 10.1 AgentLoop 引擎

参考 Vercel AI SDK 的 `ToolLoopAgent` 和 OpenAI Agents SDK 的 Runner，实现可控的 Agent 执行循环：

```ts
/**
 * Agent 运行循环伪代码：
 *
 * 1. prepareStep(ctx)   - 每步前钩子（上下文裁剪、动态模型选择）
 * 2. model.generate()   - 调用 LLM
 * 3. parseResponse()    - 解析返回：纯文本 / tool_call 
 * 4. 分支:
 *    - 纯文本 → emit text:delta → 继续循环直到模型 finish
 *    - tool_call → emit tool:call → executeTool() → emit tool:result → 回到步骤 1
 * 5. stopWhen()         - 每轮检查是否满足停止条件
 * 6. 超过 maxSteps → 强制终止并抛出错误
 */

interface AgentLoop {
  run(agent: Agent, input: AgentInput): Promise<AgentOutput>;
  runStream(agent: Agent, input: AgentInput): AsyncIterable<AgentStreamChunk>;
}
```

### 10.2 停止条件

```ts
// 内置停止条件
const stopConditions = {
  /** 达到最大步数 */
  stepCountIs: (n: number) => (ctx: StepContext) => ctx.stepNumber >= n,

  /** 模型返回 final 状态 */
  modelFinished: () => (ctx: StepContext) => ctx.finishReason === 'stop',

  /** 自定义组合 */
  any: (...conditions: StopCondition[]) => (ctx: StepContext) => conditions.some(c => c(ctx)),
};

// 使用
const agent = createAgent({
  // ...
  runConfig: {
    stopWhen: stopConditions.any(
      stopConditions.stepCountIs(20),
      (ctx) => ctx.totalTokens > 50000, // Token 上限
    ),
  },
});
```

### 10.3 prepareStep 钩子

每步执行前调用，用于动态调整执行参数：

```ts
const agent = createAgent({
  runConfig: {
    async prepareStep(ctx) {
      // 动态选择模型：前几步用便宜模型，复杂任务用强模型
      if (ctx.stepNumber > 5) {
        ctx.model = 'gpt-5'; // 切换到更强的模型
      }

      // 根据执行情况动态注入提示
      if (ctx.stepNumber > 10 && !ctx.toolCalls.length) {
        ctx.messages.push({
          role: 'system',
          content: '提示：你似乎卡住了，请尝试换个思路。',
        });
      }

      return ctx;
    }
  }
});
```

***

## 11. 可观测性

### 11.1 设计

提供可插拔的观测接口，支持集成各类监控平台：

```ts
interface Tracer {
  /** 追踪一个 Agent Run */
  trace(name: string, fn: (span: Span) => Promise<void>): Promise<void>;
}

interface Span {
  /** 记录事件 */
  event(name: string, attributes?: Record<string, unknown>): void;

  /** 设置属性 */
  setAttribute(key: string, value: unknown): void;

  /** 记录错误 */
  error(error: Error): void;

  /** 结束 Span */
  end(): void;
}

// 内置：控制台日志 Tracer
class ConsoleTracer implements Tracer { /* ... */ }

// 内置：OpenTelemetry Tracer（可选集成）
class OpenTelemetryTracer implements Tracer { /* ... */ }
```

### 11.2 Agent 集成

```ts
const agent = createAgent({
  name: 'nongyu-assistant',
  // 启用观测
  tracer: new ConsoleTracer(),
});

// 所有 step:start / tool:call / agent:complete 等事件
// 自动生成 Trace Span
```

***

## 12. 目录结构规划

```
packages/nongyu-agent-sdk/
├── src/
│   ├── index.ts                    # 顶层导出入口
│   │
│   ├── core/
│   │   ├── agent/
│   │   │   ├── index.ts            # createAgent, Agent 类实现
│   │   │   ├── loop/
│   │   │   │   ├── index.ts        # AgentLoop 运行引擎
│   │   │   │   ├── stop-conditions.ts  # 内置停止条件
│   │   │   │   └── prepare-step.ts     # prepareStep 钩子实现
│   │   │   └── sub-agent.ts        # Agent-as-Tool / Handoff 实现
│   │   │
│   │   ├── tool/
│   │   │   ├── index.ts            # tool() 工厂函数
│   │   │   ├── json-schema.ts      # Zod → JSON Schema 转换
│   │   │   └── registry.ts         # 工具注册表
│   │   │
│   │   ├── context/
│   │   │   ├── index.ts            # ContextManager 实现
│   │   │   ├── strategies/
│   │   │   │   ├── trimming.ts     # 裁剪策略
│   │   │   │   ├── summarization.ts # 摘要策略
│   │   │   │   └── hybrid.ts       # 混合策略
│   │   │   └── token-stats.ts      # Token 统计（基于模型 usage 响应）
│   │   │
│   │   ├── events/
│   │   │   ├── index.ts            # EventBus（基于 mitt 的类型安全封装）
│   │   │   └── adapters.ts         # 事件适配器（如 → Observable）
│   │   │
│   │   ├── model/
│   │   │   ├── index.ts            # ModelProvider 接口（OpenAI 风格兼容）
│   │   │   └── openai.ts           # OpenAI 协议适配器
│   │   │
│   │   ├── channel/
│   │   │   ├── index.ts            # Channel 接口导出
│   │   │   ├── gateway.ts          # Gateway 多通道网关
│   │   │   └── builtin/
│   │   │       ├── http.ts         # HTTP Channel
│   │   │       ├── stdio.ts        # Stdio Channel (CLI)
│   │   │       └── sse.ts          # SSE Channel
│   │   │
│   ├── client/
│   │   ├── index.ts                # AgentClient 实现
│   │   ├── sse-parser.ts           # SSE 流解析器
│   │   └── reconnect.ts            # 断线重连逻辑
│   │
│   ├── react/
│   │   ├── index.ts                # useAgent Hook
│   │   └── useAgentState.ts        # 状态管理 Hook
│   │
│   ├── shared/
│   │   ├── network.ts              # 网络请求封装（跨平台适配）
│   │   ├── abort.ts                # AbortSignal 工具
│   │   └── utils.ts                # 通用工具函数
│   │
│   ├── observability/
│   │   ├── index.ts                # Tracer / Span 接口
│   │   ├── console.ts              # ConsoleTracer
│   │   └── otel.ts                 # OpenTelemetry Tracer（可选）
│   │
│   └── types/
│       ├── index.ts                # 全局类型统一导出
│       ├── agent.ts                # AgentConfig, AgentState, RunConfig 等
│       ├── tool.ts                 # Tool, ToolContext
│       ├── context.ts              # ContextConfig, AgentContext, TokenStats
│       ├── events.ts               # AgentEventMap
│       ├── model.ts                # ModelProvider, GenerateConfig, ModelMessage, ModelUsage
│       ├── message.ts              # Message 类型
│       ├── channel.ts              # Channel, InboundEnvelope, OutboundEnvelope 等
│       └── stream.ts               # StreamChunk, AgentStreamChunk
│
├── test/
│   ├── agent.test.ts
│   ├── tool.test.ts
│   ├── context.test.ts
│   ├── loop.test.ts
│   └── integration.test.ts
│
├── package.json
├── tsconfig.json
├── tsup.config.ts                   # 构建配置
└── TECH-DESIGN.md
```

***

## 13. 对外 API 设计

### 13.1 顶层导出

```ts
// nongyu-agent-sdk
export {
  // Agent
  createAgent,
  Agent,
  type AgentConfig,
  type AgentState,
  type AgentStatus,

  // Tool
  tool,
  type Tool,
  type ToolContext,

  // Context
  createContextManager,
  type ContextManager,
  type ContextConfig,

  // Events
  type AgentEventMap,

  // Model
  type ModelProvider,

  // Loop
  stopConditions,
  type StopCondition,

  // Channel
  Gateway,
  type ChannelPlugin,
  type InboundEnvelope,
  type OutboundEnvelope,

  // Client
  AgentClient,
  type AgentClientConfig,

  // Observability
  type Tracer,
  ConsoleTracer,
} from './core';
```

### 13.2 子路径导出

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./react": "./dist/react/index.js",
    "./channel": "./dist/core/channel/index.js",
    "./observability": "./dist/observability/index.js"
  }
}
```

***

## 14. 实施路线图

### Phase 1：核心基础（当前 → 第 1 周）

- [ ] 实现 `tool()` 工厂函数 + Zod → JSON Schema 转换
- [ ] 实现 `EventBus`（基于 mitt 的类型安全封装）
- [ ] 实现 `ModelProvider` 接口 + OpenAI 适配器
- [ ] 实现 `createAgent()` 基本工厂函数（无子 Agent、无流式）
- [ ] 实现 `AgentLoop` 基本运行循环（单 Agent + 工具调用）
- [ ] 单元测试

### Phase 2：上下文与流式（第 2 周）

- [ ] 实现 `ContextManager` + 裁剪策略（Trimming）
- [ ] 实现流式生成（`agent.stream()`）
- [ ] 实现 SSE 协议编码/解码
- [ ] 实现 `AgentClient` 客户端 + 断线重连
- [ ] 实现 React `useAgent` Hook（基础版）

### Phase 3：多 Agent 与高级特性（第 3 周）

- [ ] 实现 Agent-as-Tool（子 Agent 自动封装为 Tool）
- [ ] 实现 Handoff 移交机制
- [ ] 实现 `prepareStep` 钩子
- [ ] 实现 `stopConditions` + 自定义停止条件
- [ ] 实现工具审批（`needsApproval`）

### Phase 4：通道（第 4 周）

- [ ] 完善 `Gateway` 多通道管理
- [ ] 实现内置 Channel：HTTP / SSE / Stdio

### Phase 5：可观测与适配（第 5 周）

- [ ] 实现 `ConsoleTracer` + `OpenTelemetryTracer`
- [ ] 实现 `SummarizationStrategy` + `HybridStrategy` 上下文策略
- [ ] React Hook 完善（`useAgentState`，审批交互 UI 支持）
- [ ] 集成测试 + 文档

***

## 参考

| 来源                                                                                                                | 相关要点                                                               |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [Vercel AI SDK 6](https://ai-sdk.dev/)                                                                            | ToolLoopAgent、Agent 接口、Tool 定义、streaming、SSE、stopWhen、prepareStep  |
| [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/)                                               | Agent-as-Tool、Handoff、Guardrails、Context Management、Session Memory |
| [Anthropic Agent 最佳实践](https://docs.anthropic.com/en/docs/agents-and-tools)                                       | Prompt + Tools = Agent、Tool use patterns、Context engineering       |
| [OpenAI Context Engineering Cookbook](https://developers.openai.com/cookbook/examples/agents_sdk/session_memory/) | Trimming / Summarization 策略、Session 管理                             |

