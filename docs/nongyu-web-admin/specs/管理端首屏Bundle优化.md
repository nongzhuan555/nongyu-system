# Spec：管理端首屏 Bundle 优化

| 项       | 内容                                         |
| -------- | -------------------------------------------- |
| 版本     | v1.0                                         |
| 日期     | 2026-09-04                                   |
| 需求类型 | **基建**（生产构建与加载策略，不改业务语义） |
| 状态     | 已确认（对齐会话内优化方案后实施）           |

---

## 1. 背景

生产构建产物为单一 JS：约 **3.2 MB / gzip ~1.1 MB**，首屏约 8–9 秒。原因包括：路由无代码分割、壳层静态挂载智慧助手、echarts/antd/agent-sdk 等重依赖进主包、`vite.config` 无分包策略。

## 2. 目标

| 指标                  | 目标                                                              |
| --------------------- | ----------------------------------------------------------------- |
| 登录页首包 JS（gzip） | 相对优化前明显下降（目标 **&lt; ~400 KB gzip** 量级，以实测为准） |
| 登录后按路由按需加载  | 各业务页与助手为独立 chunk                                        |
| echarts               | 按需注册图表类型，不引入全量 `echarts`                            |
| agent-sdk             | 管理端不打进 `jiaowu`/`second` 业务工具链                         |
| 行为不变              | 路由、鉴权、助手、大屏图表功能与优化前一致                        |

## 3. 边界（非目标）

- 不改业务 API、鉴权、助手对话协议
- 不强制改 Nginx 配置（文档可建议 gzip/brotli）
- 不做 SSR / 微前端
- 不引入新 UI 库

## 4. 详细需求

1. **已登录整包懒加载**：登录页留在入口；`AuthedApp`（壳 + 全部业务页）`React.lazy` 一次加载。**禁止**对 AuthedApp 内页面再二级 `lazy`（易白屏）。
2. **助手按需加载**：仅在 `AdminShell`（已属 AuthedApp）内对 `AssistantPanel` lazy；登出清理动态 import。
3. **ECharts 按需**：`EchartsBlock` 使用 `echarts/core` + 所需 chart/component，禁止默认全量包。
4. **Vite 分包**：禁止强制 vendor `codeSplitting.groups`。保留合理 `chunkSizeWarningLimit`；用 `scripts/check-chunk-cycles.mjs` 检查。
5. **SDK 子路径**：`jiaowuTools` / `secondTools` 从主入口移出；RN/App 改从子路径导入；管理端仅用核心 API。
6. **字体**：降低 Google Fonts 对首屏的阻塞。
7. **错误边界**：入口挂 `AppErrorBoundary`，避免异常只剩白屏。

## 5. 验收

- `pnpm --filter nongyu-web-admin build` 产出 **多个** JS chunk，且登录相关入口体积显著小于优化前单文件。
- 登录 → 工作台 → 大屏图表 → 打开助手，功能正常。
- `pnpm type-check` / lint 通过；RN 侧若引用 `jiaowuTools`/`secondTools`，导入路径已更新且能构建。
