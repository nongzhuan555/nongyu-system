# AI 二课活动卡片渲染

| 项       | 内容                                                      |
| -------- | --------------------------------------------------------- |
| 版本     | v1.0                                                      |
| 日期     | 2026-08-15                                                |
| 需求类型 | 业务（复用现有 Generative UI 基建）                       |
| 关联     | `packages/nongyu-agent-sdk`、`apps/nongyu-rn-app`         |
| 上游文档 | `docs/nongyu-rn-app/tech/Agent生成UI渲染能力-技术方案.md` |

---

## 1. 背景

农屿 RN App 的 `nongyu-agent-sdk` 与 `src/agent-ui` 渲染框架已落地，首个 mock 示例 `weather_query` + `WeatherCard` 已跑通。二课活动查询工具 `second_activity_list` 已封装，但当前返回 JSON 字符串，未声明 `render`，也未在 RN Agent 中注册，导致 AI 对话中无法以内联卡片形式展示二课活动。

## 2. 目标

让 AI 在回答“二课活动”相关问题时，调用 `second_activity_list` 工具，并在 assistant 消息内联渲染二课活动卡片列表，支持：

- 加载态（骨架屏）
- 成功态（活动卡片横向/纵向列表）
- 失败态（错误提示）
- 用户点击卡片项 → 语义消息回流 → 触发下一轮 Agent 决策（如打开详情、报名咨询）

## 3. 边界

**本期做：**

- 仅 `second_activity_list` 一个工具的 Generative UI 卡片。
- 仅展示活动列表，不直接执行报名等副作用。
- 复用现有 `SecondActivitiesScreen` 的卡片视觉风格。
- 仅返回结构化数据，不改动 `nongyu-tool-second` 的底层接口。

**本期不做：**

- 其他二课工具（成绩、学时、附加分等）的卡片渲染。
- 教务工具的卡片渲染。
- RN 内部操作工具（页面跳转、打开设置等）。
- 报名、签到等写操作。
- 引入新的 Markdown 库（沿用现有纯 Text 渲染）。

## 4. 详细需求

### 4.1 数据契约

`second_activity_list` 的 `execute` 返回 `SecondResult<ActItem[]>` 结构化对象，而非 `JSON.stringify` 字符串：

```ts
interface ActItem {
  id?: number;
  title?: string;
  logo?: string;
  typeName?: string;
  addr?: string;
  startTime?: string;
  statusName?: string;
}

interface SecondResult<T> {
  success: boolean;
  result: T;
  message?: string;
}
```

工具声明增加：

```ts
render: {
  component: "SecondActivityListCard";
}
```

### 4.2 卡片组件

新建 `apps/nongyu-rn-app/src/components/agent/SecondActivityListCard.tsx`：

- Props 类型：`ToolRenderProps<ListActivitiesParams, SecondResult<ActItem[]>>`。
- `status === 'executing' || !output`：渲染骨架屏。
- `status === 'error'`：渲染错误提示。
- `output.success === false`：渲染空态/失败提示。
- 成功且 `result` 非空：渲染活动列表（横向 FlashList，避免撑爆对话）。
- 点击项：调用 `onAction?.("查看二课活动：{title}")`。

### 4.3 注册与接入

- `src/agent-ui/register.ts` 注册 `second_activity_list → SecondActivityListCard`。
- `src/agent/agent.ts` 的 `tools` 中增加 `second_activity_list`（视情况同步加入其他二课/教务工具，但本期仅 `second_activity_list` 做卡片）。
- 系统提示词中说明该工具会以卡片形式展示结果。

### 4.4 性能

- 卡片组件使用 `React.memo`。
- 列表使用 `FlashList`（当前项目锁定 2.0.2，该版本不暴露 `estimatedItemSize`，后续升级时重新评估）。
- 对话内最多展示前 5 条 + “查看更多”按钮触发 onAction 回流。

## 5. 业务流程

```
用户输入："最近有什么二课活动？"
  → Agent.stream()
  → 模型调用 second_activity_list
  → 流式输出 tool:call { callId, toolName, input, renderComponent }
  → useAgentChat 写入 ToolCallRecord(status='executing')
  → RN 渲染 SecondActivityListCard 骨架屏

  → 工具执行完成，返回 { success: true, result: ActItem[] }
  → 流式输出 tool:result { callId, output }
  → useAgentChat 按 callId 回填 output
  → RN 渲染活动卡片列表

  → 用户点击某活动卡片
  → onAction("查看二课活动：校园歌手赛")
  → append 用户消息 → 触发 Agent 新一轮决策
```

## 6. 验收标准与测试方案

### 6.1 验收标准

- [ ] 在 AI 页输入“二课活动”后，模型能调用 `second_activity_list`。
- [ ] 工具执行期间对话内出现骨架屏。
- [ ] 工具成功后对话内出现活动卡片列表（至少含标题、分类、时间、地点）。
- [ ] 点击卡片项能触发 `onAction` 回流，产生新的用户消息。
- [ ] 工具失败或返回空列表时，卡片展示友好提示而非崩溃。
- [ ] `pnpm --filter nongyu-rn-app type-check` 通过。
- [ ] `pnpm --filter nongyu-agent-sdk type-check` 通过（若有该命令）。

### 6.2 测试方案

- 真机/模拟器：在 AI 页输入“二课活动”并观察卡片渲染。
- 单元测试：验证 `second_activity_list` 工具返回结构化对象且携带 `renderComponent`。
- 类型检查：跑 `type-check` 命令确保无类型回归。

## 7. 风险

| 风险             | 说明                     | 对策                               |
| ---------------- | ------------------------ | ---------------------------------- |
| 二课未登录       | 工具调用可能因未登录失败 | 卡片渲染失败态，提示用户先登录二课 |
| 活动列表过长     | 撑爆对话高度             | 最多展示前 5 条 + 横向滚动         |
| 模型不调用该工具 | 系统提示词未明确         | 在 systemPrompt 中补充说明         |
| 数据结构字段缺失 | 二课 API 返回字段不稳定  | 卡片字段全部做兜底显示             |
