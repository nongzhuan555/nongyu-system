---
name: react-hooks-patterns
description: "关于 React Hooks 和状态管理模式的专业指南。包括自定义 Hooks、副作用管理和 React 19 新 API。在设计复杂逻辑或管理应用状态时使用此 Skill。"
---

# React Hooks 与状态模式

React 逻辑复用和状态管理的最佳实践。

## 何时应用
- 为共享逻辑设计自定义 Hooks 时。
- 管理复杂的组件状态或全局状态时。
- 处理副作用（API 调用、订阅）时。
- 实现 React 19 新 API 时。

## 核心规则

### 1. Hooks 精通
- **自定义 Hooks**：将复杂逻辑提取到自定义 Hooks 中（如 `useAuth`, `useForm`）。
- **依赖数组**：始终在 `useEffect`, `useCallback`, 和 `useMemo` 的依赖数组中包含所有使用的变量。
- **清理机制**：始终在 `useEffect` 中为订阅或定时器返回清理函数。

### 2. 状态管理
- **局部 vs 全局**：从局部状态 (`useState`) 开始。只有在状态确实是全局的情况下才移动到 `Context` 或外部存储。
- **Reducer 模式**：对于下一个状态取决于前一个状态的复杂状态对象，使用 `useReducer`。
- **派生状态**：如果一个值可以从 Props 或现有状态计算出来，不要将其放入状态中。

### 3. React 19 新模式
- **use() API**：使用 `use` API 以更灵活的方式读取 Promise 或 Context 等资源。
- **Action 状态**：使用 `useActionState`（原 `useFormState`）处理表单提交及其挂起/错误状态。
- **乐观 UI**：使用 `useOptimistic` 在异步操作期间提供即时反馈。

### 4. 副作用安全
- **避免竞态条件**：使用 AbortController 或标志位来忽略 `useEffect` 中过时的 API 响应。
- **事件处理函数**：尽可能在事件处理函数中执行副作用，而不是在 `useEffect` 中。

---
**参考资料**: [react-use](https://github.com/streamich/react-use), [React 19 博客](https://react.dev/blog/2024/12/05/react-19)
