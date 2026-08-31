# PRD：RN Agent 流式 Markdown 渲染（对齐 Web 方案 A）

## 背景

Web 管理端问数助手已用 `remend` + 始终 Markdown 做流式渲染。RN Agent 仍是「流式纯 Text，完成后切 Markdown」，观感不一致，结束时有硬切。

## 目标

RN `AssistantMessage` 与 Web 对齐：流式过程中即 Markdown；半截语法用 remend 补全；落盘仍为原始 content。

## 方案

方案 A：`remend` + 现有 `react-native-markdown-display`。保留现有 40ms 文本节流。

## 非目标

- 不上 Streamdown / react-native-streamdown / enriched-markdown
- 不抽共享 packages（本期 rn-app 与 web-admin 各自声明 remend）
- 不加流式 caret；不改工具卡片与会话持久化
