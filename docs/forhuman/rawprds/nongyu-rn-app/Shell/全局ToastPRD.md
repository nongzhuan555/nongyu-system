# PRD：全局统一 Toast（草稿，会话确认）

| 项       | 内容                              |
| -------- | --------------------------------- |
| 应用     | `apps/nongyu-rn-app`              |
| 需求类型 | 基建                              |
| 来源     | 2026-08-13 会话确认（全部按推荐） |

## 要做什么

封装全局统一的 Toast 组件与调用 API，UI 高级简约；业务侧禁止再直接使用 `react-native-toast-message`。

## 已确认决策

1. 仅 RN App
2. API：`toast.success` / `toast.error` / `toast.info`
3. 类型：success | error | info；标题必填、副文案可选；不做操作按钮
4. 视觉：轻量毛玻璃胶囊、顶部居中、极淡描边、左侧细色条区分类型
5. 现有所有 `Toast.show` 全量迁移

## 非目标

- Web Admin / Web Site
- warning 类型、action 按钮、队列自定义策略（沿用底层库默认）
