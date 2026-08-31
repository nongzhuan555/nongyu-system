# Spec：农屿 Agent 工具 UI 显示开关（`showUI`）

| 项       | 内容                                                                                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 应用     | `packages/nongyu-agent-sdk`（主契约）；`apps/nongyu-rn-app`；`apps/nongyu-web-admin`                                                                     |
| 需求类型 | **基建**                                                                                                                                                 |
| PRD      | `docs/forhuman/rawprds/nongyu-rn-app/Shell/农屿Agent工具UI显示开关PRD.md`                                                                                |
| 关联     | `docs/nongyu-rn-app/tech/Agent生成UI渲染能力-技术方案.md`（既有 A2UI）；RN `AssistantMessage` / `ToolCallView`；Web Admin `MessageList` / `ToolCallView` |
| 状态     | **已落地（待人工回归）**                                                                                                                                 |
| 技术方案 | 本期跳过                                                                                                                                                 |

---

## 1. 背景

**Why**：多步工具链中，前置取数工具若注册了 A2UI，也会在回复下方出卡片，用户只关心核心结果，中间 UI 造成噪音。  
**What**：为带 `render` 的工具调用增加模型可控的 `showUI` 开关；前端仅渲染需要展示的调用。

---

## 2. 目标

1. 凡 `ToolDefinition.render` 已声明的工具，LLM 可见可选入参 `showUI: boolean`。
2. 模型可根据「是否面向用户展示」设置 `showUI`；省略时行为与改造前一致（显示）。
3. `showUI === false` 时，RN / Web Admin 对话面不出现该次调用的任何 UI（卡片、chip、折叠计数均不计）。
4. `showUI` 不进入业务 `execute` 入参；会话落盘的 `ToolCallRecord` 可回放该开关。
5. RN / Web Admin 的 systemPrompt 与 schema description 均有简明指引。

---

## 3. 边界（非目标）

- 不修改各业务工具的业务字段与 `execute` 逻辑（除 schema 自动注入外）
- 不引入新的 Generative UI 范式；不生成 JSX/HTML
- 不取消 RN「多工具折叠」能力，仅规定与 `showUI` 的过滤顺序
- 不为「无 `render` 声明」的工具注入 `showUI`
- 不写独立技术方案文档；本期不强制单独实施计划文档（审查通过后可直接按 Spec 编码）
- 不要求历史已落盘消息自动回填 `showUI`（缺省按 `true` 处理即可）

---

## 4. Grill 共识

| 决策     | 结论                                                  |
| -------- | ----------------------------------------------------- |
| 归类     | 基建                                                  |
| 暴露     | SDK 对有 `render` 的工具自动注入 `showUI`；执行前剥离 |
| 默认     | 省略 / 非 boolean → 视为 `true`                       |
| 隐藏表现 | 完全不渲染（对话面消失）                              |
| 范围     | SDK + RN + Web Admin                                  |
| 命名     | `showUI`                                              |
| 折叠     | 先过滤可见，再折叠                                    |
| 指引     | systemPrompt + schema description                     |
| 记录     | `ToolCallRecord.showUI`；`input` 剥离后无此字段       |
| 文档     | PRD + Spec；跳过 Tech                                 |

---

## 5. 详细需求

### 5.1 SDK：JSON Schema 注入

对 `renderComponent`（即定义了 `render`）的工具，在 `toJSONSchema()` / `ToolRegistry.getToolSchemas()` 产出的 `parameters` 中：

- 若 `properties` 尚无 `showUI`，则注入：

```json
"showUI": {
  "type": "boolean",
  "description": "是否在对话中渲染本工具的结果 UI。面向用户的核心结果为 true 或省略；仅作后续工具前置取数时为 false。"
}
```

- **不要**把 `showUI` 加入 Zod `inputSchema` 的业务 shape（避免污染 `z.infer`）；注入发生在导出给 LLM 的 JSON Schema 层。
- 若业务 JSON Schema 已存在同名 `showUI` 属性：视为冲突，**跳过注入**并在开发环境 `console.warn`（保留业务字段；文档约定业务工具禁止占用该保留名）。

无 `render` 的工具：不注入。

### 5.2 SDK：解析、剥离与记录

在工具调用入参进入 `execute` / 审批回调之前：

1. 从原始 arguments 读取 `showUI`：
   - `true` / `false` → 采用
   - 缺失或其它类型 → `true`
2. 从传给 `inputSchema.parse` / `execute` / `onApprove` 的对象中**删除** `showUI`。
3. `ToolCallRecord` 增加：

| 字段     | 类型                             | 含义                        |
| -------- | -------------------------------- | --------------------------- |
| `showUI` | `boolean`（可选，缺省按 `true`） | 本调用是否应在对话面渲染 UI |

4. `ToolCallRecord.input` 仅为剥离后的业务参数。
5. 流式 `tool:call` 写入记录时即带上 `showUI`（与 `input`/`renderComponent`/`status` 同期），便于流式过程中前端即可隐藏。

工具仍照常执行；`showUI` 只影响前端是否渲染，不影响模型上下文中的 tool result 内容。

### 5.3 前端渲染规则（RN + Web Admin）

对每条 `ToolCallRecord`：

| 条件                                    | 行为                                                          |
| --------------------------------------- | ------------------------------------------------------------- |
| `showUI === false`                      | **不渲染任何东西**（不卡片、不 chip）；不计入折叠「可见」列表 |
| `showUI !== false`（含缺省）且已注册 UI | 按现有逻辑渲染注册组件                                        |
| `showUI !== false` 且未注册 UI          | 按现有逻辑渲染折叠 chip（若该端有 chip）                      |

辅助判定建议：`const shouldShowToolUI = (tc) => tc.showUI !== false`（历史消息无字段 → 显示）。

### 5.4 RN：与多工具折叠的组合

现有 `AssistantMessage`：`toolCalls.length > 1` 时默认只展示最后一条，可展开。

改造后：

1. `visibleForUi = toolCalls.filter(tc => tc.showUI !== false)`
2. 仅对 `visibleForUi` 计算折叠：`visibleForUi.length > 1` 才折叠；默认展示 `visibleForUi` 的最后一条
3. 折叠文案中的数量基于 `visibleForUi`，不含 `showUI === false` 的调用

### 5.5 Web Admin

`MessageList`（或等价渲染处）对 `toolCalls` 做同样的 `showUI !== false` 过滤后再 `ToolCallView`。  
本期 Web Admin 若无「多工具折叠」，仅过滤即可。

### 5.6 模型指引文案

**RN**（`NONGYU_AGENT_SYSTEM_PROMPT_BASE` 或紧随其后的短段）与 **Web Admin** 主 Agent `systemPrompt` 增加等价规则（措辞可微差，语义一致），例如：

> 带结果卡片的工具均有可选参数 `showUI`。用户需要看到的核心结果：`showUI` 为 true 或省略；仅为后续工具准备数据的中间调用：必须传 `showUI: false`，避免对话中堆叠无关卡片。

Schema 字段 description 见 §5.1（两端共用 SDK，无需各写一份 schema）。

### 5.7 持久化

会话存盘的 `toolCalls` 应包含 `showUI`（若当时为 `false` 必须写出，避免回放后变回显示）。  
读旧数据无该字段时按 `true`。

---

## 6. 业务流程

```
用户提问
  → 模型多步 tool call（部分 showUI:false，核心 showUI:true/省略）
  → SDK：解析 showUI → 剥离 → execute → ToolCallRecord{ showUI, input(无showUI), ... }
  → useAgentChat 写入 message.toolCalls
  → RN/Web：filter showUI!==false →（RN）再折叠 → ToolCallView
  → 用户仅看到核心 UI；中间调用结果仍进入后续模型上下文
```

---

## 7. 验收标准与测试

### 7.1 功能

| #   | 场景                                        | 期望                                                 |
| --- | ------------------------------------------- | ---------------------------------------------------- |
| 1   | 单工具、省略 `showUI`                       | 与改造前一致，显示注册 UI                            |
| 2   | 单工具、`showUI: true`                      | 显示 UI                                              |
| 3   | 单工具、`showUI: false`                     | 对话面无该工具任何 UI；工具仍执行，模型能用到 result |
| 4   | 多工具：前 N-1 个 `false`，最后 `true`/省略 | 默认只见核心卡片；折叠计数不含隐藏项                 |
| 5   | 全部 `showUI: false`                        | 工具区不出现；文本回复正常                           |
| 6   | 无 `render` 的工具                          | schema 无 `showUI`；行为不变                         |
| 7   | 历史消息无 `showUI` 字段                    | 仍显示（兼容）                                       |
| 8   | Web Admin 带 UI 工具 + `showUI: false`      | 不渲染                                               |

### 7.2 SDK 单元（建议）

- 有 `render` 的工具 `toJSONSchema()` 含 `showUI`
- 无 `render` 不含
- 剥离后 `execute` 收不到 `showUI`
- 记录上 `showUI` 正确；`input` 无该键
- 非法类型按 `true`

### 7.3 UI（人工）

- RN：多步「搜索/列表 → 详情」类问题，中间卡片不再刷屏，核心卡片仍在
- Web Admin：对已注册 UI 的工具抽测同逻辑

### 7.4 回归

- 审批类工具（`needsApproval`）入参不含 `showUI`
- 平台伪工具 `platform_llm_busy_nav` 等既有特例不受损

---

## 8. 实现要点（非 Tech 文档，供编码对照）

| 区域                             | 要点                                            |
| -------------------------------- | ----------------------------------------------- |
| `Tool` / `ToolImpl.toJSONSchema` | 有 `renderComponent` 时 merge `showUI` property |
| AgentLoop / tool 执行前          | `extractShowUI` + strip；写入 `ToolCallRecord`  |
| `useAgentChat`                   | 透传 `showUI`（若 loop 已写入则无需二次逻辑）   |
| RN `AssistantMessage`            | filter → 再折叠                                 |
| RN / Web `ToolCallView`          | 可选兜底：`showUI===false` return null          |
| systemPrompt                     | RN `agent.ts`；Web Admin `assistant/agent.ts`   |
