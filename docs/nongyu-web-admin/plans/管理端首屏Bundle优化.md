# Plan：管理端首屏 Bundle 优化

| 项   | 内容                                                  |
| ---- | ----------------------------------------------------- |
| Spec | `docs/nongyu-web-admin/specs/管理端首屏Bundle优化.md` |
| 日期 | 2026-09-04                                            |

## 步骤

1. `AppRouter`：业务页 `React.lazy` + `Suspense`/`RouteLoading`；登录页保持静态；`AuthedApp` default export。
2. `AdminShell`：`AssistantPanel` 首次打开后再动态加载。
3. `EchartsBlock`：`echarts/core` 按需注册；`echarts-for-react/esm/core`（勿用 `lib/core`）。
4. `vite.config.ts`：**不要**强制 vendor `codeSplitting.groups`（与懒加载组合易循环依赖白屏）。
5. `nongyu-agent-sdk`：主入口去掉 jiaowu/second；新增 `./jiaowu`、`./second`；RN `agent.ts` 改导入。
6. `index.html`：字体 stylesheet 非阻塞加载。
7. 本地 `build` 对比 chunk；记 BugLog。
8. 修复登录后 React #130：ESM 图表组件 + RGL CJS 解包；`dashboardCharts` 对空/缺字段短路。
