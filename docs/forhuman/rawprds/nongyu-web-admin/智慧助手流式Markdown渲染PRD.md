# PRD：智慧助手流式 Markdown 渲染（方案 A）

## 背景

管理端智慧助手（问数）流式出字时，正文用纯文本展示；生成结束后才切到 Markdown。用户看不到边生成边排版的标题/加粗/列表/代码块，结束瞬间还会「啪」一下切样式。

## 目标

流式过程中即按 Markdown 语法渲染；半截语法（未闭合加粗、行内代码、链接等）不严重错排。

## 方案

方案 A：`remend` 预处理 + 现有 `react-markdown` / `remark-gfm`。  
流式时对展示用字符串做 heal；持久化仍存原始 `content`。

## 非目标

- 不上 Streamdown；不做块级 memo
- 不改 RN；不改 `nongyu-agent-sdk` 流协议
- 本期不加 rehype-sanitize、不加流式 caret（可后续补）

## 验收

打开管理端助手，发一条会产出 Markdown 的问数问题：流式过程中可见标题/加粗/列表；结束后样式连续、无纯文本→Markdown 硬切闪烁。
