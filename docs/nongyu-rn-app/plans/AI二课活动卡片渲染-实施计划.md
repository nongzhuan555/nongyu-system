# AI 二课活动卡片渲染 - 实施计划

| 项           | 内容                                                      |
| ------------ | --------------------------------------------------------- |
| 版本         | v1.0                                                      |
| 日期         | 2026-08-15                                                |
| 关联 Spec    | `docs/nongyu-rn-app/specs/AI二课活动卡片渲染.md`          |
| 关联技术方案 | `docs/nongyu-rn-app/tech/Agent生成UI渲染能力-技术方案.md` |

---

## 1. 实施步骤

| 序号 | 步骤                    | 文件                                                                    | 说明                                                                                                                                     |
| ---- | ----------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | 修改二课工具返回结构    | `packages/nongyu-agent-sdk/src/core/tool/ExternalTools/second-tools.ts` | `second_activity_list` 不再 `JSON.stringify`，直接返回 `SecondResult<ActItem[]>`；增加 `render: { component: 'SecondActivityListCard' }` |
| 2    | 创建 RN 渲染卡片        | `apps/nongyu-rn-app/src/components/agent/SecondActivityListCard.tsx`    | 三态渲染 + 活动列表 + onAction 回流                                                                                                      |
| 3    | 注册渲染组件            | `apps/nongyu-rn-app/src/agent-ui/register.ts`                           | `registerToolUI('second_activity_list', SecondActivityListCard)`                                                                         |
| 4    | 注册 Agent 工具         | `apps/nongyu-rn-app/src/agent/agent.ts`                                 | 在 `tools` 中增加 `second_activity_list`；更新系统提示词                                                                                 |
| 5    | 调整 FlashList 注册方式 | `apps/nongyu-rn-app/src/agent-ui/register.ts`、`app/_layout.tsx`        | 改为模块级注册，在启动入口 import 一次                                                                                                   |
| 6    | 类型检查                | 仓库根目录                                                              | `pnpm --filter nongyu-rn-app type-check` 和 `pnpm --filter nongyu-agent-sdk type-check`；期间修复了若干已有类型错误（见 BugLog）         |
| 7    | 运行验证                | 真机/模拟器                                                             | 在 AI 页输入“二课活动”，验证卡片渲染和点击回流                                                                                           |
| 8    | 文档与 BugLog           | `docs/common/BugLog.md`                                                 | 追加类型错误修复记录                                                                                                                     |

---

## 2. 注意事项

- **工具返回结构**：改为对象后，`AgentLoop` 中会把 `typeof output === 'string'` 的内容直接作为 tool 消息 content，否则 `JSON.stringify`。返回对象时会被 JSON.stringify 成字符串传给模型，这是 OK 的。
- **类型安全**：`SecondResult` 和 `ActItem` 类型需要从 `nongyu-tool-second` 导出，避免在 SDK 中重复定义。当前 `nongyu-tool-second` 已导出 `ListActivitiesParams`，但 `ActItem` 类型未显式导出。需要确认是否可从 `nongyu-tool-second` 复用，或在卡片组件中本地定义。
- **图片加载**：活动 logo 使用 `expo-image` 的 `Image` 组件，已存在于依赖中。
- **事件回流**：点击卡片项触发 `onAction("查看二课活动：{title}")`，不直接调用 router.push，保持 Agent 是副作用入口。
- **登录态**：工具执行失败时由 `status === 'error'` 或 `output.success === false` 展示错误，不阻塞其他消息。
- **模块级注册**：`register.ts` 改为在 import 时自动注册，`app/_layout.tsx` 顶部 `import "@/agent-ui/register"` 一次即可，避免每次进入 AI 页重复调用。
- **FlashList 版本**：RN 当前锁定 `@shopify/flash-list@2.0.2`，其 `FlashListProps` 尚未包含 `estimatedItemSize`，故卡片内 FlashList 不填该属性；后续升级 FlashList 时重新评估。

---

## 3. 回滚计划

- 若 `SecondResult` 类型无法从 `nongyu-tool-second` 复用，则本地定义轻量类型，不改动 `nongyu-tool-second`。
- 若卡片渲染在对话内有严重性能问题，可降级为纯文本列表（保留 render 声明但组件简化）。
