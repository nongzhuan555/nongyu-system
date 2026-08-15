# AI 教务卡片渲染

| 项       | 内容                                                      |
| -------- | --------------------------------------------------------- |
| 版本     | v1.0                                                      |
| 日期     | 2026-08-15                                                |
| 需求类型 | 业务（复用现有 Generative UI 基建）                       |
| 关联     | `packages/nongyu-agent-sdk`、`apps/nongyu-rn-app`         |
| 上游文档 | `docs/nongyu-rn-app/tech/Agent生成UI渲染能力-技术方案.md` |

---

## 1. 背景

农屿 RN App 的 `nongyu-agent-sdk` 与 `src/agent-ui` 渲染框架已落地，`weather_query` + `WeatherCard`、`second_activity_list` + `SecondActivityListCard` 已跑通。教务侧工具已封装在 SDK 的 `jiaowuTools` 与本地 `courseExtTools` 中，但当前全部返回 JSON 字符串，未声明 `render`，也未在 RN Agent 中注册，导致 AI 对话中无法以内联卡片形式展示教务数据。

## 2. 目标

让 AI 在回答教务、课表相关问题时，调用对应工具并在 assistant 消息内联渲染教务卡片，支持：

- 加载态（骨架屏）
- 成功态（数据卡片）
- 失败态（错误提示）
- 卡片内交互直接跳转对应页面（保留路由栈，不回流 Agent）

## 3. 边界

**本期做：**

- 接入 25 个教务/课表相关工具的 Generative UI 卡片。
- 统一把工具返回从 `JSON.stringify` 字符串改为结构化对象，便于渲染层消费。
- 复用现有教务页面（ScoreScreen / ExamScreen / CourseScreen 等）的视觉风格与数据解析逻辑。
- 卡片内点击项直接 `router.push` 到对应页面，保留路由栈。

**本期不做：**

- 不改动 `nongyu-tool-jiaowu` / `nongyu-tool-second` 的底层数据抓取逻辑。
- 不在卡片内直接执行写操作（报名、签到、选课等）——点击后跳转到原页面或触发页面内操作。
- 不引入新的 Markdown 库（沿用现有纯 Text 渲染）。
- 不新增教务/课表工具本身，仅给已有工具加渲染能力。

## 4. 详细需求

### 4.0 共识决策

| 决策     | 结论                                                                         |
| -------- | ---------------------------------------------------------------------------- |
| 范围     | 25 个教务/课表工具全部接入，分三批次实现                                     |
| 组件策略 | 复用现有 Screen 的视觉/数据逻辑，创建轻量聊天内卡片（不直接嵌入完整 Screen） |
| 交互     | 卡片内跳转对应页面，保留路由栈；不回流 Agent                                 |
| 数据格式 | 工具返回统一从 JSON 字符串改为结构化对象                                     |
| 列表展示 | 对话内最多展示前 5 条 + 「查看全部」按钮跳转                                 |

### 4.1 数据契约

所有教务工具的 `execute` 返回统一改为 `SecondResult<T>` 风格结构化对象：

```ts
interface ToolResult<T> {
  success: boolean;
  result: T;
  message?: string;
}
```

当前工具多数返回 `JSON.stringify(...)`，接入时需改为返回对象，例如：

```ts
// 修改前
async execute() {
  const res = await getScoreInfo();
  return JSON.stringify(res);
}

// 修改后
async execute() {
  return await getScoreInfo();
}
```

### 4.2 工具与卡片映射表

| 批次 | 工具名                    | 工具源 | 输出类型                      | 卡片组件名              | 跳转页面                   |
| ---- | ------------------------- | ------ | ----------------------------- | ----------------------- | -------------------------- |
| 1    | `jiaowu_score_info`       | SDK    | `ToolResult<ScoreItem[]>`     | `ScoreCard`             | `/home/jiaowu/score`       |
| 1    | `jiaowu_exam_info`        | SDK    | `ToolResult<ExamItem[]>`      | `ExamCard`              | `/home/jiaowu/exam`        |
| 1    | `jiaowu_course_info`      | SDK    | `ToolResult<CourseItem[]>`    | `CourseCard`            | `/home/course`             |
| 1    | `jiaowu_personal_info`    | SDK    | `ToolResult<PersonalInfo>`    | `PersonalInfoCard`      | `/home/jiaowu`             |
| 2    | `jiaowu_notice_info`      | SDK    | `ToolResult<NoticeItem[]>`    | `NoticeCard`            | `/home/jiaowu/notice`      |
| 2    | `jiaowu_competition_info` | SDK    | `ToolResult<NoticeItem[]>`    | `CompetitionCard`       | `/home/jiaowu/competition` |
| 2    | `jiaowu_progress_info`    | SDK    | `ToolResult<ProgressItem[]>`  | `ProgressCard`          | `/home/jiaowu/progress`    |
| 2    | `jiaowu_rank_info`        | SDK    | `ToolResult<RankData>`        | `RankCard`              | `/home/jiaowu/rank`        |
| 2    | `jiaowu_plan_info`        | SDK    | `ToolResult<PlanData>`        | `PlanCard`              | `/home/jiaowu/plan`        |
| 3    | `jiaowu_classroom_course` | SDK    | `ToolResult<CourseItem[]>`    | `ClassroomCourseCard`   | `/home/course`             |
| 3    | `jiaowu_teacher_course`   | SDK    | `ToolResult<CourseItem[]>`    | `TeacherCourseCard`     | `/home/course`             |
| 3    | `course_schedule_list`    | 本地   | `ScheduleEntry[]`             | `CourseScheduleCard`    | `/home/course`             |
| 3    | `course_note_list`        | 本地   | `CourseNote[]`                | `CourseNoteCard`        | `/home/course`             |
| 3    | `course_todo_list`        | 本地   | `CourseTodo[]`                | `CourseTodoCard`        | `/home/course`             |
| 3    | `course_ext_snapshot`     | 本地   | `{ schedules, notes, todos }` | `CourseExtSnapshotCard` | `/home/course`             |
| 增补 | `course_share_diff`       | 本地   | 对比摘要（冲突/空档时段）     | `CourseShareDiffCard`   | 课表 Tab Diff 态           |

写操作工具（`course_schedule_create/update/delete`、`course_note_create/update/delete`、`course_todo_create/update/toggle/delete`）本期**不单独渲染卡片**，但工具返回需改为对象以便后续扩展。

### 4.3 卡片设计原则

每个卡片组件统一遵循以下契约：

```ts
type CardProps<TArgs, TOutput> = ToolRenderProps<TArgs, TOutput>;
```

- `executing` 或 `output === undefined`：渲染骨架屏。
- `error`：渲染错误提示，并提供「重试」按钮跳转对应页面。
- `success === false` 或空数据：渲染空态提示，提供「去查看」按钮跳转对应页面。
- 成功有数据：渲染前 5 条数据，底部显示「查看全部」按钮跳转对应页面。
- 点击列表项直接跳转对应页面，不调用 `onAction`。
- 所有卡片使用 `React.memo` 包裹，避免逐 token 重渲染。

### 4.4 各卡片详细需求

#### 4.4.1 ScoreCard（成绩卡片）

- 复用 `ScoreScreen` 的按学期分组逻辑与卡片样式。
- 展示最近 2 个学期，每学期最多 3 条课程成绩。
- 每条展示：课程名、成绩、学分、绩点、课程类型。
- 底部「查看全部成绩」→ `/home/jiaowu/score`。
- 点击课程项 → `/home/jiaowu/score`（当前页面无详情，跳转页面后用户自行搜索）。

#### 4.4.2 ExamCard（考试安排卡片）

- 复用 `ExamScreen` 的卡片样式。
- 最多展示 5 条考试记录。
- 每条展示：课程名、考试时间、考场、座位号、考核方式。
- 底部「查看全部考试」→ `/home/jiaowu/exam`。

#### 4.4.3 CourseCard（课表卡片）

- 复用 `CourseScreen` 的课程项样式，但不在卡片内展示完整周视图。
- 展示当天/本周课程摘要（最多 5 条）。
- 每条展示：课程名、上课时间、教室、教师。
- 底部「打开课表」→ `/home/course`。

#### 4.4.4 PersonalInfoCard（个人信息卡片）

- 复用 `JiaowuHomeScreen` 个人信息卡样式。
- 展示：姓名、学号、学院、专业、班级、年级。
- 提供「查看完整信息」→ `/home/jiaowu`。

#### 4.4.5 NoticeCard / CompetitionCard（通知卡片）

- 复用 `NoticeScreen` / `CompetitionScreen` 的列表样式。
- 最多展示 5 条通知。
- 每条展示：标题、日期。
- 点击项 → 打开浏览器查看详情（复用原页面逻辑）。
- 底部「查看全部」→ `/home/jiaowu/notice` 或 `/home/jiaowu/competition`。

#### 4.4.6 ProgressCard（学业进度卡片）

- 复用 `ProgressScreen` 的进度条样式。
- 展示最多 5 项学分进度。
- 每项展示：学分类型、应修/已修/进度、进度条、学分差。
- 底部「查看全部进度」→ `/home/jiaowu/progress`。

#### 4.4.7 RankCard（专业排名卡片）

- 复用 `RankScreen` 的展签式布局，但缩小尺寸适配对话。
- 展示：专业排名、加权成绩、学籍状态。
- 底部「查看详情」→ `/home/jiaowu/rank`。

#### 4.4.8 PlanCard（培养方案卡片）

- 复用 `PlanScreen` 的课程列表样式。
- 展示最多 5 门课程。
- 每条展示：课程名、课程代码、类型、学分、执行学期。
- 底部「查看完整培养方案」→ `/home/jiaowu/plan`。

#### 4.4.9 ClassroomCourseCard / TeacherCourseCard（公共课表卡片）

- 复用 `CourseScreen` 的课程项样式。
- 展示查询到的最多 5 条课程记录。
- 底部「在课表中查看」→ `/home/course`。

#### 4.4.10 CourseScheduleCard / CourseNoteCard / CourseTodoCard / CourseExtSnapshotCard（课表扩展卡片）

- 复用 `course` 模块的扩展数据样式。
- 展示对应扩展数据列表，最多 5 条。
- 底部「打开课表」→ `/home/course`。

### 4.5 注册与接入

- 在 `packages/nongyu-agent-sdk/src/core/tool/ExternalTools/jiaowu-tools.ts` 为每个工具增加 `render: { component: "XxxCard" }`。
- 在 `apps/nongyu-rn-app/src/modules/course/agent/courseTools.ts` 为读工具增加 `render` 声明，并把返回改为对象。
- 在 `apps/nongyu-rn-app/src/components/agent/` 创建上述卡片组件。
- 在 `apps/nongyu-rn-app/src/agent-ui/register.ts` 追加 `registerToolUI` 注册表。
- 在 `apps/nongyu-rn-app/src/agent/agent.ts` 的 `systemPrompt` 中补充说明：教务/课表查询结果会以卡片形式展示，并引导模型优先调用对应工具。

### 4.6 系统提示词更新

在 `agent.ts` 的 `systemPrompt` 中补充：

> 教务、课表、成绩、考试、学业进度等查询结果会以卡片形式展示在对话中；用户点击卡片可跳转详情页。请按需调用 `jiaowu_score_info` / `jiaowu_exam_info` / `jiaowu_course_info` / `jiaowu_personal_info` 等工具，不要返回纯文本 JSON。

## 5. 业务流程

```text
用户输入："我下周有哪些考试？"
  → Agent.stream()
  → 模型调用 jiaowu_exam_info
  → 流式输出 tool:call { callId, toolName, input, renderComponent: "ExamCard" }
  → useAgentChat 写入 ToolCallRecord(status='executing')
  → RN 渲染 ExamCard 骨架屏

  → 工具执行完成，返回 { success: true, result: ExamItem[] }
  → 流式输出 tool:result { callId, output }
  → useAgentChat 按 callId 回填 output
  → RN 渲染考试安排卡片列表

  → 用户点击「查看全部考试」或某条考试记录
  → router.push('/home/jiaowu/exam')
  → 用户可在原页面继续操作，返回键回到 AI 对话
```

## 6. 实现批次

| 批次   | 工具/卡片                                                                                                           | 核心目标               | 验证方式                                            |
| ------ | ------------------------------------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------- |
| 第一批 | `jiaowu_score_info` / `jiaowu_exam_info` / `jiaowu_course_info` / `jiaowu_personal_info`                            | 覆盖 80% 高频教务查询  | AI 页输入「成绩/考试/课表/个人信息」 → 卡片内联出现 |
| 第二批 | `jiaowu_notice_info` / `jiaowu_competition_info` / `jiaowu_progress_info` / `jiaowu_rank_info` / `jiaowu_plan_info` | 覆盖通知与学业相关     | 对应查询出现卡片并可跳转                            |
| 第三批 | `jiaowu_classroom_course` / `jiaowu_teacher_course` / `course_*` 读工具                                             | 覆盖公共课表与课表扩展 | 对应查询出现卡片                                    |

每批次独立开发、联调、合并，降低一次性改动风险。

## 7. 验收标准与测试方案

### 7.1 验收标准

- [ ] 所有接入工具的 `execute` 返回结构化对象而非 `JSON.stringify` 字符串。
- [ ] 所有接入工具携带 `render` 声明，且组件名与注册表一致。
- [ ] AI 页输入对应查询后，模型调用工具并出现卡片骨架屏。
- [ ] 工具成功后，对话内出现真实数据卡片（至少含关键字段）。
- [ ] 卡片失败或空数据时展示友好提示，不崩溃。
- [ ] 点击卡片「查看全部」/列表项可跳转对应页面，并保留路由栈。
- [ ] 卡片内交互不触发 `onAction` 回流。
- [ ] `pnpm --filter nongyu-rn-app type-check` 通过。
- [ ] `pnpm --filter nongyu-agent-sdk type-check` 通过。

### 7.2 测试方案

- 真机/模拟器：在 AI 页输入各批次对应的查询语句，观察卡片渲染与跳转。
- 单元测试：验证工具返回对象结构、携带 `renderComponent`。
- 类型检查：跑 `type-check` 确保无类型回归。

## 8. 风险

| 风险                         | 说明                                           | 对策                                                                       |
| ---------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------- |
| 工具返回格式改动影响旧调用方 | 从 JSON 字符串改为对象，可能破坏已有文本消费方 | 仅 AI Agent 使用这些工具，需同步更新 `systemPrompt` 与卡片；旧调用方不存在 |
| 现有 Screen 直接复用尺寸过大 | 完整页面塞进对话会撑爆                         | 不直接嵌入 Screen，而是提取其核心列表/卡片组件复用                         |
| 教务未登录                   | 工具调用可能因未登录失败                       | 卡片渲染失败态，提示用户先登录教务；点击跳转登录页                         |
| 数据列表过长                 | 成绩/考试/课表可能很多                         | 最多展示前 5 条 + 「查看全部」跳转                                         |
| 模型不调用对应工具           | 系统提示词未明确                               | 在 systemPrompt 中补充说明，并添加工具示例                                 |
| 跳转后返回路由栈混乱         | 从 AI 页跳走再返回                             | 统一使用 `router.push`，保留栈；返回即回到 AI 对话                         |

## 9. 修订记录

| 日期       | 说明                                                             |
| ---------- | ---------------------------------------------------------------- |
| 2026-08-15 | 初版：覆盖 25 个教务/课表工具，分三批次接入，复用现有页面组件    |
| 2026-08-15 | 增补 `course_share_diff` / `CourseShareDiffCard`（课表共享对比） |
